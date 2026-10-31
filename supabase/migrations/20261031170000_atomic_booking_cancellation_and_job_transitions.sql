-- Keep booking cancellation and technician-job transitions in one transaction.
-- Service-role-only RPCs: callers must authenticate and authorize before invoking.

CREATE OR REPLACE FUNCTION public.cancel_booking_atomic(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_job_count integer := 0;
BEGIN
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BOOKING_ID';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'on_the_way') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_CANCELLABLE';
  END IF;

  UPDATE public.technician_jobs
  SET status = 'rejected'
  WHERE booking_id = p_booking_id
    AND status IN ('assigned', 'accepted', 'on_the_way', 'in_progress', 'job_started');
  GET DIAGNOSTICS v_job_count = ROW_COUNT;

  UPDATE public.bookings
  SET status = 'cancelled',
      assigned_technician_id = NULL,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'cancelled_job_records', v_job_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.transition_technician_job_atomic(
  p_job_id uuid,
  p_technician_id uuid,
  p_requested_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.technician_jobs%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_booking_status text;
BEGIN
  IF p_job_id IS NULL OR p_technician_id IS NULL OR p_requested_status IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_JOB_TRANSITION_ARGUMENTS';
  END IF;

  SELECT * INTO v_job
  FROM public.technician_jobs
  WHERE id = p_job_id AND technician_id = p_technician_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOB_NOT_FOUND';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_job.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.assigned_technician_id IS DISTINCT FROM p_technician_id
     AND p_requested_status <> 'rejected' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_ASSIGNMENT_MISMATCH';
  END IF;

  IF NOT (
    (v_job.status = 'assigned' AND p_requested_status IN ('accepted', 'rejected')) OR
    (v_job.status = 'accepted' AND p_requested_status IN ('on_the_way', 'rejected')) OR
    (v_job.status = 'on_the_way' AND p_requested_status = 'in_progress') OR
    (v_job.status = 'in_progress' AND p_requested_status IN ('job_started', 'completed')) OR
    (v_job.status = 'job_started' AND p_requested_status IN ('job_completed', 'completed')) OR
    (v_job.status = 'job_completed' AND p_requested_status = 'completed')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_JOB_STATUS_TRANSITION';
  END IF;

  v_booking_status := CASE
    WHEN p_requested_status = 'rejected' THEN 'pending'
    ELSE p_requested_status
  END;

  UPDATE public.technician_jobs
  SET status = p_requested_status,
      completed_at = CASE
        WHEN p_requested_status IN ('job_completed', 'completed') THEN now()
        ELSE completed_at
      END
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  UPDATE public.bookings
  SET status = v_booking_status,
      assigned_technician_id = CASE
        WHEN p_requested_status = 'rejected' THEN NULL
        ELSE assigned_technician_id
      END,
      job_completed_at = CASE
        WHEN p_requested_status = 'job_completed' THEN now()
        ELSE job_completed_at
      END,
      updated_at = now()
  WHERE id = v_booking.id
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object('job', to_jsonb(v_job), 'booking', to_jsonb(v_booking));
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_booking_atomic(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_atomic(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.cancel_booking_atomic(uuid) IS
  'Atomically cancels an eligible booking, rejects active technician-job rows, and releases its assignment.';
COMMENT ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) IS
  'Atomically transitions a technician job and synchronizes its booking status in one transaction.';
