-- Finalize the public booking boundary.
-- Guest and signed-in booking creation now goes through booking-ops using service_role.
-- No browser client needs direct bookings table access for creation, reads, updates, or deletes.

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "public_select_bookings" ON bookings;
DROP POLICY IF EXISTS "public_update_bookings" ON bookings;
DROP POLICY IF EXISTS "public_delete_bookings" ON bookings;

CREATE POLICY "deny_public_bookings" ON bookings FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Customers are also accessed through customer-auth/customer-data.
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
DROP POLICY IF EXISTS "public_select_customers" ON customers;
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;

CREATE POLICY "deny_public_customers" ON customers FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
