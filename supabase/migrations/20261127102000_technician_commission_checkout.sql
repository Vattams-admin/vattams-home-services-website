CREATE FUNCTION public.technician_commission_checkout(
  p_technician_id uuid,
  p_job_id uuid,
  p_upi_id text,
  p_utr text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_job public.technician_jobs%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_owner text;
  v_name text;
  v_amount numeric;
BEGIN
  SELECT * INTO v_job FROM public.technician_jobs
  WHERE id = p_job_id AND technician_id = p_technician_id FOR UPDATE;
  IF NOT FOUND OR v_job.status IS DISTINCT FROM 'completed'
    OR NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = v_job.booking_id
      AND b.status = 'completed' AND b.assigned_technician_id = p_technician_id) THEN
    RETURN jsonb_build_object('error', 'Completed job not found.');
  END IF;

  SELECT id::text, full_name INTO v_owner, v_name FROM public.technicians
  WHERE id = p_technician_id AND status = 'active';
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('error', 'Technician account is unavailable.');
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE purpose = 'commission' AND payee_type = 'technician'
    AND reference_id = p_job_id::text AND payee_id = v_owner
    AND status IN ('pending', 'success')
  ORDER BY (status = 'success') DESC NULLS LAST, created_at DESC, id
  LIMIT 1 FOR UPDATE;

  IF p_utr IS NOT NULL AND p_utr !~ '^[A-Z0-9]{6,32}$' THEN
    RETURN jsonb_build_object('error', 'Enter a valid UPI transaction reference.');
  END IF;

  IF v_payment.id IS NULL THEN
    IF p_utr IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'Open UPI checkout before submitting a reference.');
    END IF;
    IF p_upi_id IS NULL OR p_upi_id !~ '^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$' THEN
      RETURN jsonb_build_object('error', 'UPI checkout is currently unavailable.');
    END IF;
    v_amount := v_job.offered_commission;
    IF v_amount IS NULL
      OR NOT (v_amount > 0 AND v_amount < 10000000000 AND v_amount = round(v_amount, 2)) THEN
      RETURN jsonb_build_object('error', 'This job has no commission due.');
    END IF;
    INSERT INTO public.payments (payee_type, payee_id, payee_name, upi_id, amount, purpose, reference_id, status)
    VALUES ('technician', v_owner, v_name, p_upi_id, v_amount, 'commission', p_job_id::text, 'pending')
    RETURNING * INTO v_payment;
  ELSIF p_utr IS NOT NULL AND v_payment.utr IS DISTINCT FROM p_utr THEN
    IF v_payment.status IS DISTINCT FROM 'pending' OR v_payment.utr IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'This payment already has a reference or has been reviewed.');
    END IF;
    BEGIN
      UPDATE public.payments SET utr = p_utr WHERE id = v_payment.id
      RETURNING * INTO v_payment;
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object('error', 'This UPI reference has already been submitted.');
    END;
  END IF;

  RETURN jsonb_build_object(
    'payment', jsonb_build_object('status', v_payment.status, 'amount', v_payment.amount,
      'upi_id', v_payment.upi_id, 'utr', v_payment.utr)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.technician_commission_checkout(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.technician_commission_checkout(uuid, uuid, text, text)
  TO service_role;
