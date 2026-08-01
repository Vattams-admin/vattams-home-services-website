/*
# VATTAMS Marketplace Upgrade — Dynamic Pricing, Booking Workflow, OTP, Chat, Privacy

1. service_categories — add pricing fields
   - base_price (numeric, default 299)
   - gst_rate (numeric, default 18%)
   - platform_fee (numeric, default 49)
   - commission_rate (numeric, default 10%)

2. bookings — add pricing breakdown + OTP + workflow columns
   - base_price, gst_amount, platform_fee, commission_amount, total_amount
   - start_otp, complete_otp (text, nullable)
   - otp_verified_at, job_started_at, job_completed_at (timestamptz)
   - Expanded status CHECK to include: assigned, accepted, on_the_way, job_started, job_completed

3. technicians — add location for radius matching
   - latitude, longitude (numeric, nullable)
   - radius_km (numeric, default 10)

4. wallet_settings — add assignment_radius_km (default 15)

5. New table: chat_messages
   - In-app chat between customer and technician
   - booking_id, sender_type, sender_id, message

6. Security
   - RLS enabled on chat_messages with anon+authenticated CRUD
   - All existing policies preserved
*/

-- ============ service_categories: pricing fields ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_categories' AND column_name='base_price') THEN
    ALTER TABLE service_categories ADD COLUMN base_price numeric(10,2) NOT NULL DEFAULT 299;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_categories' AND column_name='gst_rate') THEN
    ALTER TABLE service_categories ADD COLUMN gst_rate numeric(5,2) NOT NULL DEFAULT 18.00;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_categories' AND column_name='platform_fee') THEN
    ALTER TABLE service_categories ADD COLUMN platform_fee numeric(10,2) NOT NULL DEFAULT 49;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_categories' AND column_name='commission_rate') THEN
    ALTER TABLE service_categories ADD COLUMN commission_rate numeric(5,2) NOT NULL DEFAULT 10.00;
  END IF;
END $$;

-- ============ bookings: pricing breakdown ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='base_price') THEN
    ALTER TABLE bookings ADD COLUMN base_price numeric(10,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='gst_amount') THEN
    ALTER TABLE bookings ADD COLUMN gst_amount numeric(10,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='platform_fee') THEN
    ALTER TABLE bookings ADD COLUMN platform_fee numeric(10,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='commission_amount') THEN
    ALTER TABLE bookings ADD COLUMN commission_amount numeric(10,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='total_amount') THEN
    ALTER TABLE bookings ADD COLUMN total_amount numeric(10,2);
  END IF;
END $$;

-- ============ bookings: OTP + workflow timestamps ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='start_otp') THEN
    ALTER TABLE bookings ADD COLUMN start_otp text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='complete_otp') THEN
    ALTER TABLE bookings ADD COLUMN complete_otp text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='otp_verified_at') THEN
    ALTER TABLE bookings ADD COLUMN otp_verified_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='job_started_at') THEN
    ALTER TABLE bookings ADD COLUMN job_started_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='job_completed_at') THEN
    ALTER TABLE bookings ADD COLUMN job_completed_at timestamptz;
  END IF;
END $$;

-- ============ bookings: expand status CHECK constraint ============
DO $$
BEGIN
  -- Drop old constraint and add expanded one
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending','confirmed','assigned','accepted','on_the_way','in_progress','job_started','job_completed','completed','cancelled'));
END $$;

-- ============ technicians: location for radius matching ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='latitude') THEN
    ALTER TABLE technicians ADD COLUMN latitude numeric(9,6);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='longitude') THEN
    ALTER TABLE technicians ADD COLUMN longitude numeric(9,6);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='radius_km') THEN
    ALTER TABLE technicians ADD COLUMN radius_km numeric(5,2) NOT NULL DEFAULT 10;
  END IF;
END $$;

-- ============ wallet_settings: assignment radius ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_settings' AND column_name='assignment_radius_km') THEN
    ALTER TABLE wallet_settings ADD COLUMN assignment_radius_km numeric(5,2) NOT NULL DEFAULT 15;
  END IF;
END $$;

-- ============ chat_messages table ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer','technician','admin')),
  sender_id text NOT NULL,
  sender_name text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking ON chat_messages(booking_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_chat_messages" ON chat_messages;
CREATE POLICY "public_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_chat_messages" ON chat_messages;
CREATE POLICY "public_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_chat_messages" ON chat_messages;
CREATE POLICY "public_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_chat_messages" ON chat_messages;
CREATE POLICY "public_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============ Backfill service_categories base_price from price_range ============
DO $$
DECLARE
  cat record;
  low_val int;
BEGIN
  FOR cat IN SELECT id, price_range FROM service_categories WHERE base_price = 299 AND price_range IS NOT NULL
  LOOP
    -- Extract first number from price_range like '₹999 - ₹2,999'
    low_val := substring(cat.price_range from '\d[\d,]*')::int;
    IF low_val > 0 THEN
      UPDATE service_categories SET base_price = low_val WHERE id = cat.id;
    END IF;
  END LOOP;
END $$;

-- ============ Backfill bookings pricing from amount ============
DO $$
BEGIN
  UPDATE bookings
  SET base_price = amount,
      gst_amount = ROUND((amount * 18.0 / 100.0)::numeric, 2),
      platform_fee = 49,
      commission_amount = ROUND((amount * 10.0 / 100.0)::numeric, 2),
      total_amount = amount
  WHERE total_amount IS NULL AND amount IS NOT NULL;
END $$;
