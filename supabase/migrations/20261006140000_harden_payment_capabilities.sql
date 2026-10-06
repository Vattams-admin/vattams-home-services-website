-- Give each browser-created registration payment a private capability token.
-- The token is required to submit a UTR; payment_id alone is not sufficient.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_action_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_action_token_key
  ON payments(payment_action_token);
