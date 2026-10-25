-- Extend the existing OTP purpose constraint for technician email registration.
-- OTP rows remain server-managed by the Edge Functions; no production data is changed by this repository commit.
ALTER TABLE public.otp_codes DROP CONSTRAINT IF EXISTS otp_codes_purpose_check;
ALTER TABLE public.otp_codes
  ADD CONSTRAINT otp_codes_purpose_check
  CHECK (purpose IN ('registration', 'technician_registration', 'forgot_password', 'login'));

CREATE INDEX IF NOT EXISTS idx_otp_email_registration_lookup
  ON public.otp_codes (mobile, purpose, created_at DESC);
