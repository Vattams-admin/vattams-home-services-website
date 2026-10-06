-- Service catalog is public-read only. All administrative changes use
-- privileged server-side admin workflows.
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_insert_service_categories" ON service_categories;
DROP POLICY IF EXISTS "admin_update_service_categories" ON service_categories;
DROP POLICY IF EXISTS "admin_delete_service_categories" ON service_categories;
CREATE POLICY "deny_public_service_category_inserts"
  ON service_categories FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_service_category_updates"
  ON service_categories FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_service_category_deletes"
  ON service_categories FOR DELETE TO anon, authenticated USING (false);

-- No active client flow writes complaints directly; retain the schema/data
-- but prevent anonymous or client-authenticated mutation of complaint records.
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_complaints" ON complaints;
CREATE POLICY "deny_public_complaints"
  ON complaints FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
