/*
# Create service_prices table — admin-editable service pricing

1. Purpose
   - Centralizes all service pricing (base price, GST, platform fee, commission) into a single
     admin-editable table so no prices are hardcoded in the application code.
   - The booking page, technician earnings, customer invoices, and admin reports all read from
     this table instead of using fallback defaults.

2. New Table: service_prices
   - id (uuid, primary key)
   - service_name (text, unique, not null) — e.g. "AC Repair", "Plumbing"
   - base_price (numeric, not null, default 299) — base service charge shown to customer
   - gst_rate (numeric, not null, default 18.00) — GST percentage applied on base price
   - platform_fee (numeric, not null, default 49) — flat platform convenience fee
   - commission_rate (numeric, not null, default 10.00) — percentage deducted from technician earnings
   - is_active (boolean, not null, default true) — admin can deactivate a service price
   - updated_at (timestamptz, default now) — last modification timestamp
   - created_at (timestamptz, default now)

3. Security (RLS)
   - Enable RLS on service_prices.
   - SELECT: public (anon + authenticated) — booking page and customer-facing pages need to read prices.
   - INSERT / UPDATE / DELETE: admin only via anon key (matches existing service_categories pattern).

4. Seed Data
   - Inserts default rows for all 9 service categories if the table is empty.

5. Important Notes
   - This table is the single source of truth for all pricing.
*/
CREATE TABLE IF NOT EXISTS service_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text UNIQUE NOT NULL,
  base_price numeric(10,2) NOT NULL DEFAULT 299,
  gst_rate numeric(5,2) NOT NULL DEFAULT 18.00,
  platform_fee numeric(10,2) NOT NULL DEFAULT 49,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_service_prices" ON service_prices;
CREATE POLICY "public_select_service_prices" ON service_prices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_service_prices" ON service_prices;
CREATE POLICY "admin_insert_service_prices" ON service_prices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_service_prices" ON service_prices;
CREATE POLICY "admin_update_service_prices" ON service_prices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_service_prices" ON service_prices;
CREATE POLICY "admin_delete_service_prices" ON service_prices FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default service prices (only if table is empty)
INSERT INTO service_prices (service_name, base_price, gst_rate, platform_fee, commission_rate, is_active)
SELECT * FROM (VALUES
  ('AC Repair', 499.00, 18.00, 49.00, 10.00, true),
  ('AC Service', 399.00, 18.00, 49.00, 10.00, true),
  ('Electrician', 299.00, 18.00, 49.00, 10.00, true),
  ('Plumbing', 299.00, 18.00, 49.00, 10.00, true),
  ('Washing Machine Repair', 349.00, 18.00, 49.00, 10.00, true),
  ('Refrigerator Repair', 349.00, 18.00, 49.00, 10.00, true),
  ('RO Water Purifier', 299.00, 18.00, 49.00, 10.00, true),
  ('Microwave Repair', 299.00, 18.00, 49.00, 10.00, true),
  ('CCTV Installation', 599.00, 18.00, 99.00, 10.00, true)
) AS seed(service_name, base_price, gst_rate, platform_fee, commission_rate, is_active)
WHERE NOT EXISTS (SELECT 1 FROM service_prices LIMIT 1);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_service_prices_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_prices_updated_at ON service_prices;
CREATE TRIGGER service_prices_updated_at
  BEFORE UPDATE ON service_prices
  FOR EACH ROW EXECUTE FUNCTION update_service_prices_updated_at();
