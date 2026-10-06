ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_fcm_tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "authenticated_all_fcm_tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "public_select_fcm_tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "public_insert_fcm_tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "public_update_fcm_tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "public_delete_fcm_tokens" ON fcm_tokens;

CREATE POLICY "deny_public_fcm_token_reads"
  ON fcm_tokens FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_public_fcm_token_inserts"
  ON fcm_tokens FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_public_fcm_token_updates"
  ON fcm_tokens FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_public_fcm_token_deletes"
  ON fcm_tokens FOR DELETE TO anon, authenticated USING (false);