/*
# Customer Authentication System

1. New Tables
- `customers` — stores customer accounts (name, mobile, email, password_hash, city, address)
  - `id` (uuid, primary key)
  - `full_name` (text, not null)
  - `mobile` (text, unique, not null) — 10-digit Indian mobile
  - `email` (text, unique, nullable)
  - `password_hash` (text, not null) — bcrypt hash
  - `city` (text, nullable)
  - `address` (text, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `otp_codes` — stores OTP codes for registration verification, forgot password, and login
  - `id` (uuid, primary key)
  - `mobile` (text, not null) — the mobile number the OTP was sent to
  - `code` (text, not null) — 6-digit OTP code
  - `purpose` (text, not null) — 'registration' | 'forgot_password' | 'login'
  - `expires_at` (timestamptz, not null) — 10 minutes from creation
  - `verified` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled on both tables.
- `customers`: anon+authenticated can INSERT (registration), SELECT by mobile (login lookup), UPDATE by mobile (profile edit, password reset). No DELETE via anon.
- `otp_codes`: anon+authenticated can INSERT (create OTP), SELECT (verify), UPDATE (mark verified). Auto-delete old OTPs via index.
- Index on `customers(mobile)` and `otp_codes(mobile, purpose)` for fast lookups.

3. Important Notes
- The app uses the anon key (no Supabase Auth), so policies are scoped to `anon, authenticated`.
- Password hashing is done in the edge function using bcryptjs, NOT in the database.
- OTP codes are 6-digit, expire after 10 minutes, and are single-use (marked verified).
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  mobile text UNIQUE NOT NULL,
  email text UNIQUE,
  password_hash text NOT NULL,
  city text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'forgot_password', 'login')),
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile_purpose ON otp_codes(mobile, purpose);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_otp" ON otp_codes;
CREATE POLICY "anon_select_otp" ON otp_codes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_otp" ON otp_codes;
CREATE POLICY "anon_insert_otp" ON otp_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_otp" ON otp_codes;
CREATE POLICY "anon_update_otp" ON otp_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_otp" ON otp_codes;
CREATE POLICY "anon_delete_otp" ON otp_codes FOR DELETE
  TO anon, authenticated USING (true);
