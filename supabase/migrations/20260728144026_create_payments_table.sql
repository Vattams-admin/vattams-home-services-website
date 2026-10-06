/*
# Create payments table for UPI payment tracking

The production project may already contain a legacy `payments` table created
outside this migration chain. Keep this migration idempotent so the expected
payment columns exist before indexes/policies are applied.
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL DEFAULT ('VHP' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  payee_type text NOT NULL CHECK (payee_type IN ('customer','technician')),
  payee_id text NOT NULL,
  payee_name text,
  upi_id text NOT NULL DEFAULT 'venkatesan04051985-7@okhdfcbank',
  amount numeric(12,2) NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('booking','registration_fee','wallet_recharge','commission')),
  reference_id text,
  utr text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  notes text,
  verified_by text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- The table can predate this migration in production. In that case
-- CREATE TABLE IF NOT EXISTS does not alter its existing shape. The
-- payee_id column is required by the payment-auth service and its index.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payee_id text;

CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_payments" ON payments;
CREATE POLICY "public_select_payments" ON payments FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_payments" ON payments;
CREATE POLICY "public_insert_payments" ON payments FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_payments" ON payments;
CREATE POLICY "public_update_payments" ON payments FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_payments" ON payments;
CREATE POLICY "public_delete_payments" ON payments FOR DELETE
TO anon, authenticated USING (true);
