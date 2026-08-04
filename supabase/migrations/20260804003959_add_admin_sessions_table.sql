/*
# Add admin_sessions table

1. New Tables
- `admin_sessions` — stores admin login sessions with expiry.
  - `id` (uuid, primary key)
  - `admin_id` (uuid, references admins)
  - `token` (text, unique) — the session token
  - `expires_at` (timestamptz) — when the session expires
  - `created_at` (timestamptz)

2. Security
- RLS enabled; only service role can read/write (no anon policies).

3. Important Notes
- Sessions expire after 8 hours.
- The admin-auth edge function creates a session on successful login.
*/

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Seed the production admin account (bcrypt hash of the admin password)
-- Using a pre-computed bcrypt hash so the plaintext password is never in the migration
INSERT INTO admins (email, password_hash)
VALUES ('admin@vattams.net', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4IuVqZPYRwSHQxIe0ZQp5XK3HqP2')
ON CONFLICT (email) DO NOTHING;
