-- Lock legacy public customer/OTP tables behind the customer-auth Edge Function.
-- All active customer auth flows use service-role access inside the Edge Function.
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_otp" ON otp_codes;
DROP POLICY IF EXISTS "anon_insert_otp" ON otp_codes;
DROP POLICY IF EXISTS "anon_update_otp" ON otp_codes;
DROP POLICY IF EXISTS "anon_delete_otp" ON otp_codes;
CREATE POLICY "deny_public_otp_select" ON otp_codes FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_public_otp_insert" ON otp_codes FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_otp_update" ON otp_codes FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_otp_delete" ON otp_codes FOR DELETE TO anon, authenticated USING (false);
REVOKE ALL ON TABLE otp_codes FROM anon, authenticated;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "deny_public_customer_select" ON customers FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_public_customer_insert" ON customers FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_customer_update" ON customers FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE customers FROM anon, authenticated;
