-- Lock the payments table so public clients cannot forge or alter payment records.
-- Payment creation, UTR submission and admin verification now go through
-- the payment-auth Edge Function, which uses the Supabase service role
-- after validating the requested operation.
DROP POLICY IF EXISTS "public_insert_payments" ON payments;
DROP POLICY IF EXISTS "public_update_payments" ON payments;
DROP POLICY IF EXISTS "public_delete_payments" ON payments;

CREATE POLICY "no_public_insert_payments" ON payments FOR INSERT
TO anon, authenticated WITH CHECK (false);

CREATE POLICY "no_public_update_payments" ON payments FOR UPDATE
TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no_public_delete_payments" ON payments FOR DELETE
TO anon, authenticated USING (false);
