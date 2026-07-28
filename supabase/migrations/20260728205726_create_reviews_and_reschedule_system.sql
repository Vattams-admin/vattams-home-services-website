/*
# Customer Reviews + Booking Reschedule Support

1. New Tables
   - `reviews`
     - `id` (uuid, primary key)
     - `booking_id` (uuid, FK to bookings, unique — one review per booking)
     - `customer_id` (uuid, FK to customers)
     - `customer_name` (text)
     - `technician_id` (uuid, FK to technicians)
     - `rating` (int 1-5, not null)
     - `review_text` (text, nullable)
     - `created_at` (timestamptz)

2. Modified Tables
   - `bookings` — add `rescheduled_from` (uuid, nullable) to track reschedule history.
     - When a customer reschedules, the old booking is cancelled and a new one created with `rescheduled_from` pointing to the original.

3. Security
   - RLS enabled on `reviews`.
   - anon + authenticated CRUD (app uses anon key, no Supabase Auth sessions).
   - Unique constraint on `booking_id` to prevent duplicate reviews.
   - Index on `technician_id` for rating lookups.
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_technician ON reviews(technician_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_reviews" ON reviews;
CREATE POLICY "public_select_reviews" ON reviews FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_reviews" ON reviews;
CREATE POLICY "public_insert_reviews" ON reviews FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_reviews" ON reviews;
CREATE POLICY "public_update_reviews" ON reviews FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_reviews" ON reviews;
CREATE POLICY "public_delete_reviews" ON reviews FOR DELETE
TO anon, authenticated USING (true);

-- Add rescheduled_from column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_from uuid;
