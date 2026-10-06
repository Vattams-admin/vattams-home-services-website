-- Retire legacy client-writable AI conversation storage.
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "public_all_ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "authenticated_all_ai_conversations" ON ai_conversations;
CREATE POLICY "deny_public_ai_conversations_select" ON ai_conversations FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_public_ai_conversations_insert" ON ai_conversations FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_ai_conversations_update" ON ai_conversations FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_ai_conversations_delete" ON ai_conversations FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_crm_reminders" ON crm_reminders;
CREATE POLICY "deny_public_crm_reminders" ON crm_reminders FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "deny_public_audit_logs" ON audit_logs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
