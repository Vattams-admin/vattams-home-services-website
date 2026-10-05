-- Pricing and wallet configuration are server-owned settings.
-- Public clients may read service pricing, but may not mutate platform settings.

ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_insert_service_prices" ON service_prices;
DROP POLICY IF EXISTS "admin_update_service_prices" ON service_prices;
DROP POLICY IF EXISTS "admin_delete_service_prices" ON service_prices;
DROP POLICY IF EXISTS "public_insert_service_prices" ON service_prices;
DROP POLICY IF EXISTS "public_update_service_prices" ON service_prices;
DROP POLICY IF EXISTS "public_delete_service_prices" ON service_prices;
CREATE POLICY "deny_public_service_price_writes" ON service_prices FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_service_price_updates" ON service_prices FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_service_price_deletes" ON service_prices FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert_wallet_settings" ON wallet_settings;
DROP POLICY IF EXISTS "public_update_wallet_settings" ON wallet_settings;
DROP POLICY IF EXISTS "public_delete_wallet_settings" ON wallet_settings;
CREATE POLICY "deny_public_wallet_setting_writes" ON wallet_settings FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_wallet_setting_updates" ON wallet_settings FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_wallet_setting_deletes" ON wallet_settings FOR DELETE TO anon, authenticated USING (false);
