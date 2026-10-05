-- Technician records contain KYC, wallet, status and operational fields.
-- All current technician reads/writes are routed through technician-auth,
-- technician-data, admin-data or other service-role Edge Functions.

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_technicians" ON technicians;
DROP POLICY IF EXISTS "public_insert_technicians" ON technicians;
DROP POLICY IF EXISTS "public_update_technicians" ON technicians;
DROP POLICY IF EXISTS "public_delete_technicians" ON technicians;

CREATE POLICY "deny_public_technicians" ON technicians FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

ALTER TABLE technician_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_technician_jobs" ON technician_jobs;
DROP POLICY IF EXISTS "public_insert_technician_jobs" ON technician_jobs;
DROP POLICY IF EXISTS "public_update_technician_jobs" ON technician_jobs;
DROP POLICY IF EXISTS "public_delete_technician_jobs" ON technician_jobs;
CREATE POLICY "deny_public_technician_jobs" ON technician_jobs FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
