-- Consume a verified password-reset OTP and update its customer in one transaction.
-- A row lock prevents concurrent reset requests from reusing the same verification.
CREATE OR REPLACE FUNCTION public.reset_customer_password_with_verified_otp(
  p_otp_id uuid,
  p_mobile text,
  p_password_hash text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_otp public.otp_codes%ROWTYPE;
  v_updated integer;
BEGIN
  IF p_otp_id IS NULL OR p_mobile IS NULL OR p_mobile !~ '^[6-9][0-9]{9}$'
     OR p_password_hash IS NULL OR length(p_password_hash) < 20 THEN
    RAISE EXCEPTION 'Invalid customer password reset arguments';
  END IF;

  SELECT * INTO v_otp
    FROM public.otp_codes
   WHERE id = p_otp_id
     AND mobile = p_mobile
     AND purpose = 'forgot_password'
     AND verified = true
     AND expires_at > pg_catalog.clock_timestamp()
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.customers
     SET password_hash = p_password_hash,
         updated_at = pg_catalog.clock_timestamp()
   WHERE mobile = p_mobile;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one customer for verified mobile number';
  END IF;

  -- A password reset is a credential-compromise recovery flow: revoke every
  -- existing device session in the same transaction as the password/OTP change.
  DELETE FROM public.customer_auth_sessions
   WHERE customer_id = (
     SELECT id FROM public.customers WHERE mobile = p_mobile
   );

  DELETE FROM public.otp_codes
   WHERE id = p_otp_id
     AND mobile = p_mobile
     AND purpose = 'forgot_password'
     AND verified = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified password reset OTP could not be consumed';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_customer_password_with_verified_otp(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_customer_password_with_verified_otp(uuid, text, text) TO service_role;
