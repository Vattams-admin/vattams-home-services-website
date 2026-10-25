-- Atomic technician assignment.
-- The booking claim, technician workload check, and technician_jobs insert must
-- commit or roll back together. Locking the technician row serializes concurrent
-- assignment attempts for the same technician.
CREATE OR REPLACE FUNCTION public.assign_technician_job_atomic(
  p_booking_id uuid,
  p_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_technician public.technicians%ROWTYPE;
  v_job public.technician_jobs%ROWTYPE;
  v_requested text;
  v_accepted text[];
BEGIN
  IF p_booking_id IS NULL OR p_technician_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ASSIGNMENT_ARGUMENTS';
  END IF;

  SELECT b.*
    INTO v_booking
    FROM public.bookings AS b
   WHERE b.id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed')
     OR v_booking.assigned_technician_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BOOKING_NOT_ASSIGNABLE';
  END IF;

  -- Row-level lock is the serialization point for all assignments to this tech.
  SELECT t.*
    INTO v_technician
    FROM public.technicians AS t
   WHERE t.id = p_technician_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_FOUND';
  END IF;

  IF v_technician.status IS DISTINCT FROM 'active'
     OR COALESCE(v_technician.wallet_locked, false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_ELIGIBLE';
  END IF;

  IF lower(regexp_replace(trim(COALESCE(v_technician.city, '')), '\s+', ' ', 'g'))
     <> lower(regexp_replace(trim(COALESCE(v_booking.city, '')), '\s+', ' ', 'g')) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_ELIGIBLE';
  END IF;

  v_requested := lower(regexp_replace(trim(COALESCE(v_booking.service_category, '')), '\s+', ' ', 'g'));
  v_accepted := CASE
    WHEN v_requested IN ('ac service', 'ac repair', 'air conditioner service')
      THEN ARRAY['ac service', 'ac technician', 'ac repair', 'air conditioner service']
    WHEN v_requested IN ('washing machine', 'washing machine repair')
      THEN ARRAY['washing machine', 'washing machine repair', 'washing machine technician', 'home appliance repair']
    WHEN v_requested IN ('refrigerator', 'refrigerator repair', 'fridge')
      THEN ARRAY['refrigerator', 'refrigerator repair', 'fridge', 'home appliance repair']
    ELSE ARRAY[v_requested]
  END;

  IF NOT EXISTS (
    SELECT 1
      FROM unnest(COALESCE(v_technician.service_categories, ARRAY[]::text[])) AS c(category)
     WHERE lower(regexp_replace(trim(COALESCE(c.category, '')), '\s+', ' ', 'g')) = ANY(v_accepted)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_ELIGIBLE';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.technician_jobs AS tj
     WHERE tj.technician_id = p_technician_id
       AND tj.status IN ('assigned', 'accepted', 'on_the_way', 'in_progress', 'job_started')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_ALREADY_BUSY';
  END IF;

  INSERT INTO public.technician_jobs (
    booking_id,
    technician_id,
    status,
    job_amount,
    call_rate_fee,
    service_type
  ) VALUES (
    p_booking_id,
    p_technician_id,
    'assigned',
    COALESCE(v_booking.base_price, 0),
    COALESCE(v_booking.call_rate_fee, 0),
    NULLIF(v_booking.service_type, '')
  )
  RETURNING * INTO v_job;

  UPDATE public.bookings
     SET assigned_technician_id = p_technician_id,
         status = 'assigned',
         updated_at = now()
   WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'job', to_jsonb(v_job)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_technician_job_atomic(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_technician_job_atomic(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_technician_job_atomic(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.assign_technician_job_atomic(uuid, uuid) IS
  'Atomically assigns one eligible technician to one pending/confirmed booking and creates its technician_jobs row.';
