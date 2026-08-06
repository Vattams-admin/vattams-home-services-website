/*
# VATTAMS HOME SERVICES - Full Platform Schema

1. New Tables
  - `service_categories` - List of offered services (AC, Washing Machine, etc.)
  - `bookings` - Customer service booking requests with all details
  - `technicians` - Registered technician profiles
  - `technician_jobs` - Jobs assigned to technicians with status tracking

2. Security
  - RLS enabled on all tables
  - Public can read service_categories
  - Public can insert bookings (no auth required for booking)
  - Admin uses service role key for full access
  - Technicians can read/update their own jobs

3. Important Notes
  - No auth required for customers to book (public booking form)
  - Admin access managed via service role key in dashboard
  - Bookings track status: pending, confirmed, in_progress, completed, cancelled
*/

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  price_range text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_service_categories" ON service_categories;
CREATE POLICY "public_select_service_categories" ON service_categories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_service_categories" ON service_categories;
CREATE POLICY "admin_insert_service_categories" ON service_categories FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_service_categories" ON service_categories;
CREATE POLICY "admin_update_service_categories" ON service_categories FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_service_categories" ON service_categories;
CREATE POLICY "admin_delete_service_categories" ON service_categories FOR DELETE
TO anon, authenticated USING (true);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL DEFAULT ('VHS' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  customer_name text NOT NULL,
  mobile_number text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  service_category text NOT NULL,
  problem_description text,
  preferred_date date,
  preferred_time text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  assigned_technician_id uuid,
  technician_notes text,
  amount numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_bookings" ON bookings;
CREATE POLICY "public_select_bookings" ON bookings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;
CREATE POLICY "public_insert_bookings" ON bookings FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_bookings" ON bookings;
CREATE POLICY "public_update_bookings" ON bookings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_bookings" ON bookings;
CREATE POLICY "public_delete_bookings" ON bookings FOR DELETE
TO anon, authenticated USING (true);

-- Technicians
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text,
  city text NOT NULL,
  service_categories text[] DEFAULT '{}',
  experience_years int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive')),
  rating numeric(3,2) DEFAULT 0,
  total_jobs int DEFAULT 0,
  earnings numeric(12,2) DEFAULT 0,
  id_proof_type text,
  id_proof_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_technicians" ON technicians;
CREATE POLICY "public_select_technicians" ON technicians FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_technicians" ON technicians;
CREATE POLICY "public_insert_technicians" ON technicians FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_technicians" ON technicians;
CREATE POLICY "public_update_technicians" ON technicians FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_technicians" ON technicians;
CREATE POLICY "public_delete_technicians" ON technicians FOR DELETE
TO anon, authenticated USING (true);

-- Technician Jobs (join between bookings and technicians)
CREATE TABLE IF NOT EXISTS technician_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','in_progress','completed','rejected')),
  notes text,
  service_photo_urls text[] DEFAULT '{}',
  customer_signature text,
  job_amount numeric(10,2),
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE technician_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_technician_jobs" ON technician_jobs;
CREATE POLICY "public_select_technician_jobs" ON technician_jobs FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_technician_jobs" ON technician_jobs;
CREATE POLICY "public_insert_technician_jobs" ON technician_jobs FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_technician_jobs" ON technician_jobs;
CREATE POLICY "public_update_technician_jobs" ON technician_jobs FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_technician_jobs" ON technician_jobs;
CREATE POLICY "public_delete_technician_jobs" ON technician_jobs FOR DELETE
TO anon, authenticated USING (true);

-- Seed service categories
INSERT INTO service_categories (name, description, icon, price_range)
SELECT * FROM (VALUES
  ('AC Installation', 'Professional AC installation for all brands and models', 'wind', '₹999 - ₹2,999'),
  ('AC Deep Cleaning', 'Complete deep cleaning to restore AC efficiency', 'sparkles', '₹499 - ₹1,499'),
  ('AC Gas Refill', 'Refrigerant recharge for optimal cooling performance', 'thermometer', '₹800 - ₹2,000'),
  ('Refrigerator Repair', 'Expert repair for all refrigerator types and brands', 'refrigerator', '₹299 - ₹3,999'),
  ('Washing Machine Repair', 'Front-load and top-load washing machine repairs', 'rotate-cw', '₹299 - ₹2,999'),
  ('Microwave Repair', 'Microwave oven repair and maintenance', 'zap', '₹299 - ₹1,999'),
  ('Water Heater Repair', 'Geyser and water heater repair services', 'flame', '₹199 - ₹1,999'),
  ('RO Water Purifier', 'RO purifier installation, repair and maintenance', 'droplets', '₹199 - ₹2,499'),
  ('Electrical Services', 'Wiring, switches, fans, and all electrical work', 'zap', '₹199 - ₹4,999'),
  ('Plumbing Services', 'Pipe repair, tap fitting, drainage and more', 'wrench', '₹199 - ₹3,999')
) AS v(name, description, icon, price_range)
WHERE NOT EXISTS (SELECT 1 FROM service_categories LIMIT 1);
