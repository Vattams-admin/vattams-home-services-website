/*
# Fix: Admin Login "Unable to verify admin account" error

## Root cause
`src/pages/AdminLogin.tsx` has always called a database RPC named
`verify_admin_login(p_email, p_password)`. Every admin-gated edge
function in this project (admin-auth, technician-auth,
tuition-tutor-admin) was written assuming this same RPC exists and
checks the `admin_users` table (see their `requireActiveAdmin`
comments, which explicitly reference `verify_admin_login`). However,
this RPC was never created in any tracked migration. Calling a
non-existent RPC returns a Postgres/PostgREST error, which
AdminLogin.tsx catches and displays as:

  "Unable to verify admin account. Please try again."

This affects 100% of login attempts, including with correct
credentials, because the failure happens before any credential check
runs.

Note: an unrelated, unused `admins` table (different schema, no
`role`/`is_active`/`full_name` columns) was created by an earlier
migration (20260804003933) with a placeholder seed row. It is not
used by any edge function or by AdminLogin.tsx and is left untouched
by this migration.

## Fix
Create the missing `verify_admin_login` RPC exactly as documented in
AdminLogin.tsx's own comments: it checks the password hash with
pgcrypto's `crypt()` server-side against `admin_users.password_hash`,
and returns a row only when role = 'super_admin' AND is_active = true.

## Security
- SECURITY DEFINER with `SET search_path = public` (no schema
  injection risk), so the function can read `admin_users` (which has
  no anon/authenticated SELECT policy) without opening a new RLS
  policy on that table.
- Returns only id, email, role, full_name — password_hash is never
  returned to the client.
- EXECUTE is granted to anon + authenticated only, matching the
  existing pattern used for `increment_coupon_usage` /
  `decrement_technician_workload` in the same project.
- No table is created, altered, or dropped. No RLS policy is added or
  changed. No admin row, password, or other production data is
  modified.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION verify_admin_login(p_email text, p_password text)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.role, au.full_name
  FROM admin_users au
  WHERE au.email = lower(trim(p_email))
    AND au.password_hash = crypt(p_password, au.password_hash)
    AND au.role = 'super_admin'
    AND au.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_login(text, text) TO anon, authenticated;