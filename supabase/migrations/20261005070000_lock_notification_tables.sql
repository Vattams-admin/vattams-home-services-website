-- Lock notification tables to trusted server-side functions.
-- The application uses custom session tokens, not Supabase Auth, so anon/authenticated
-- clients must never read, insert, update, or delete notification rows directly.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_notifications" ON notifications;
DROP POLICY IF EXISTS "public_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "public_update_notifications" ON notifications;
DROP POLICY IF EXISTS "public_delete_notifications" ON notifications;
DROP POLICY IF EXISTS "public_select_technician_notifications" ON technician_notifications;
DROP POLICY IF EXISTS "public_insert_technician_notifications" ON technician_notifications;
DROP POLICY IF EXISTS "public_update_technician_notifications" ON technician_notifications;
DROP POLICY IF EXISTS "public_delete_technician_notifications" ON technician_notifications;

CREATE POLICY "deny_anon_notifications" ON notifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_notifications" ON notifications FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_technician_notifications" ON technician_notifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_technician_notifications" ON technician_notifications FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Custom-auth users now receive notification data only through Edge Functions.
-- Realtime subscriptions are intentionally not used for these tables.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE technician_notifications;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;
