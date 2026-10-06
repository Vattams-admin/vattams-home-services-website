ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_attempt_count_nonnegative CHECK (attempt_count >= 0);
