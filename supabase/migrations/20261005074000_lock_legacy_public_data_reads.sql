-- Remove legacy public read/delete access from payment and review records.
-- Current clients use authenticated Edge Functions for these records.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_payments" ON payments;
DROP POLICY IF EXISTS "public_delete_payments" ON payments;
CREATE POLICY "deny_public_payments" ON payments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_reviews" ON reviews;
DROP POLICY IF EXISTS "public_insert_reviews" ON reviews;
DROP POLICY IF EXISTS "public_update_reviews" ON reviews;
DROP POLICY IF EXISTS "public_delete_reviews" ON reviews;
CREATE POLICY "deny_public_reviews" ON reviews FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_support" ON support_messages;
DROP POLICY IF EXISTS "public_insert_support" ON support_messages;
DROP POLICY IF EXISTS "public_update_support" ON support_messages;
DROP POLICY IF EXISTS "public_delete_support" ON support_messages;
CREATE POLICY "deny_public_support" ON support_messages FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
