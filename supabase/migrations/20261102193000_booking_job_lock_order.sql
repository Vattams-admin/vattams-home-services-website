-- Enforce a single lock order for booking/job lifecycle transitions.
-- cancel_booking_atomic locks bookings before technician_jobs. This replacement
-- makes technician transitions follow the same order to avoid a deadlock cycle.
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
  v_booking_id uuid;
  v_job public.technician_jobs%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_booking_status text;
BEGIN
  IF p_job_id IS NULL OR p_technician_id IS NULL OR p_requested_status IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_JOB_TRANSITION_ARGUMENTS';
  END IF;

  -- Read the parent key without locking the job; acquire the parent lock first.
  SELECT booking_id INTO v_booking_id
  FROM public.technician_jobs
  WHERE id = p_job_id AND technician_id = p_technician_id;

  IF NOT FOUND OR v_booking_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOB_NOT_FOUND';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_FOUND';
  END IF;

  -- Re-read/lock the child after the parent and revalidate the relationship.
  SELECT * INTO v_job
  FROM public.technician_jobs
  WHERE id = p_job_id
    AND technician_id = p_technician_id
    AND booking_id = v_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOB_NOT_FOUND';
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

  v_booking_status := CASE WHEN p_requested_status = 'rejected' THEN 'pending' ELSE p_requested_status END;

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

REVOKE ALL ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) IS
  'Atomically transitions technician job and booking using booking-first lock ordering to avoid lifecycle deadlocks.';
