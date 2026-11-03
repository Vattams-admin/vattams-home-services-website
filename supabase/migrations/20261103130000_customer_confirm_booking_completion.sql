-- Customer confirmation is the only path from technician-reported completion to final completion.
-- The edge function derives p_customer_id from the authenticated customer session.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_confirmed_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.confirm_booking_completion_atomic(
  p_booking_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_job public.technician_jobs%ROWTYPE;
BEGIN
  IF p_booking_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_COMPLETION_CONFIRMATION_ARGUMENTS';
  END IF;

  -- Lock parent booking first, matching cancellation and technician transition lock order.
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_FOUND_OR_NOT_OWNED';
  END IF;

  IF v_booking.status = 'completed' THEN
    SELECT * INTO v_job
    FROM public.technician_jobs
    WHERE booking_id = v_booking.id
      AND technician_id = v_booking.assigned_technician_id
    ORDER BY assigned_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND OR v_job.status <> 'completed' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'COMPLETED_BOOKING_JOB_MISMATCH';
    END IF;

    RETURN jsonb_build_object('booking', to_jsonb(v_booking), 'job', to_jsonb(v_job), 'already_completed', true);
  END IF;

  IF v_booking.status <> 'job_completed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_AWAITING_CUSTOMER_CONFIRMATION';
  END IF;

  IF v_booking.assigned_technician_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_HAS_NO_ASSIGNED_TECHNICIAN';
  END IF;

  -- Lock the matching child only after the booking parent has been locked.
  SELECT * INTO v_job
  FROM public.technician_jobs
  WHERE booking_id = v_booking.id
    AND technician_id = v_booking.assigned_technician_id
  ORDER BY assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_JOB_NOT_FOUND';
  END IF;

  IF v_job.status <> 'job_completed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_JOB_NOT_AWAITING_CUSTOMER_CONFIRMATION';
  END IF;

  UPDATE public.technician_jobs
  SET status = 'completed',
      completed_at = COALESCE(completed_at, now())
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  UPDATE public.bookings
  SET status = 'completed',
      customer_confirmed_completed_at = COALESCE(customer_confirmed_completed_at, now()),
      updated_at = now()
  WHERE id = v_booking.id
    AND customer_id = p_customer_id
    AND status = 'job_completed'
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_COMPLETION_STATE_CHANGED';
  END IF;

  RETURN jsonb_build_object('booking', to_jsonb(v_booking), 'job', to_jsonb(v_job), 'already_completed', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_booking_completion_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_completion_atomic(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.confirm_booking_completion_atomic(uuid, uuid) IS
  'Finalizes a technician-reported job only after the authenticated owning customer explicitly confirms it; locks booking before job and records confirmation time.';
