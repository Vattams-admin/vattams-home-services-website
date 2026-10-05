-- Secure custom admin sessions for VATTAMS Home Services.
-- The existing admin_users table is the source of truth for admin identity.
CREATE TABLE IF NOT EXISTS admin_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_auth_sessions ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service-role-backed Edge Functions may access sessions.
REVOKE ALL ON TABLE admin_auth_sessions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_admin_auth_sessions_token
  ON admin_auth_sessions(token);

CREATE INDEX IF NOT EXISTS idx_admin_auth_sessions_admin_id
  ON admin_auth_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_auth_sessions_expires_at
  ON admin_auth_sessions(expires_at);
