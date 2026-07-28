/*
# Create payments table for UPI payment tracking

1. New Tables
   - `payments`
     - `id` (uuid, primary key)
     - `payment_id` (text, unique) — human-readable payment reference like VHP-YYYYMMDD-XXXXXX
     - `payee_type` (text) — 'customer' | 'technician'
     - `payee_id` (text) — customer mobile number or technician uuid
     - `payee_name` (text) — name of the payer
     - `upi_id` (text) — the UPI ID payment was sent to
     - `amount` (numeric, not null)
     - `purpose` (text) — 'booking' | 'registration_fee' | 'wallet_recharge' | 'commission'
     - `reference_id` (text) — booking_id, technician_id, or recharge_id this payment relates to
     - `utr` (text) — UTR/transaction reference number entered by payer as confirmation
     - `status` (text) — 'pending' | 'success' | 'failed'
     - `notes` (text)
     - `verified_by` (text) — admin who verified
     - `created_at` (timestamptz)
     - `verified_at` (timestamptz)

2. Security
   - RLS enabled
   - anon + authenticated CRUD (public app, no Supabase Auth sessions)
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
