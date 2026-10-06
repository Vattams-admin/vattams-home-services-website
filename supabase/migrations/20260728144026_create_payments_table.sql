/*
# Create payments table for UPI payment tracking

Production may already contain a legacy payments table. This migration is
idempotent and upgrades that table to the schema required by payment-auth.
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

-- Legacy-table compatibility: add every field used by the production payment
-- service before indexes/policies are created. Nullable additions avoid
-- breaking existing legacy rows during the upgrade.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payee_type text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payee_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payee_name text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount numeric(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE payments ALTER COLUMN payment_id SET DEFAULT ('VHP' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)));
ALTER TABLE payments ALTER COLUMN upi_id SET DEFAULT 'venkatesan04051985-7@okhdfcbank';
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_payments" ON payments;
CREATE POLICY "public_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_payments" ON payments;
CREATE POLICY "public_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_payments" ON payments;
CREATE POLICY "public_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_payments" ON payments;
CREATE POLICY "public_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);
