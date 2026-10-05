-- Coupon definitions remain publicly readable for validation.
-- Redemption and usage counters are server-owned.
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert_coupon_redemptions" ON coupon_redemptions;
DROP POLICY IF EXISTS "anon_insert_coupon_redemptions" ON coupon_redemptions;
CREATE POLICY "deny_public_coupon_redemptions" ON coupon_redemptions FOR INSERT TO anon, authenticated WITH CHECK (false);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_update_coupons" ON coupons;
DROP POLICY IF EXISTS "public_delete_coupons" ON coupons;
CREATE POLICY "deny_public_coupon_updates" ON coupons FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_coupon_deletes" ON coupons FOR DELETE TO anon, authenticated USING (false);
