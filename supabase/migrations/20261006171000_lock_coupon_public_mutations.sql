-- Coupons are read-only from the public client.
-- All coupon redemption/mutation logic runs through trusted Edge Functions.

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_coupons" ON coupons;

CREATE POLICY "deny_public_coupon_inserts"
  ON coupons FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "deny_public_coupon_updates"
  ON coupons FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_public_coupon_deletes"
  ON coupons FOR DELETE TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE coupons FROM anon, authenticated;
