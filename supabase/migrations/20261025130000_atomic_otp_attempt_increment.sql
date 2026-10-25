-- Atomically increment OTP attempts so concurrent verification requests cannot
-- overwrite each other's counters and bypass the five-attempt limit.
CREATE OR REPLACE FUNCTION public.increment_otp_attempt_count(p_otp_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count integer;
BEGIN
  UPDATE public.otp_codes
  SET attempt_count = LEAST(attempt_count + 1, 5)
  WHERE id = p_otp_id
    AND verified = false
  RETURNING attempt_count INTO next_count;

  RETURN next_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_otp_attempt_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_otp_attempt_count(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.increment_otp_attempt_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_otp_attempt_count(uuid) TO service_role;
