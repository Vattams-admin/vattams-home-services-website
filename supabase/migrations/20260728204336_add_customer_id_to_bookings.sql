/*
# Add customer_id to bookings table

1. Modified Tables
- `bookings` — add `customer_id` (uuid, nullable, references `customers.id`)
  - Existing bookings (created before customer accounts) will have NULL customer_id.
  - New bookings made by logged-in customers will store the customer_id.
  - Added index on customer_id for fast lookup of a customer's booking history.

2. Security
- No RLS policy changes needed (bookings already has anon+authenticated CRUD policies).
*/

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
