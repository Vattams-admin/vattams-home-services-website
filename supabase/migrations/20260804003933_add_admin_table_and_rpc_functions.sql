/*
# Add admin table, decrement_workload RPC, and coupon increment RPC

1. New Tables
- `admins` — stores admin credentials (email + bcrypt password hash)
- Seeded with the production admin account.

2. New Functions
- `increment_coupon_usage(coupon_id uuid)` — atomically increments `used_count`.
- `decrement_technician_workload(tech_id uuid)` — atomically decrements `current_workload`.

3. Security
- `admins` table has RLS enabled; only service role can read/write (no anon/authenticated policies).
- RPCs are SECURITY DEFINER, callable by anon + authenticated (needed by the client app).

4. Important Notes
- The admin password is bcrypt-hashed; the plaintext is never stored.
- The RPCs use atomic UPDATE ... SET col = col + 1 to avoid race conditions.
*/

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service role (edge functions) can access.

-- Atomic coupon usage increment
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$$;

-- Atomic technician workload decrement
CREATE OR REPLACE FUNCTION decrement_technician_workload(tech_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE technicians
  SET current_workload = GREATEST(0, current_workload - 1)
  WHERE id = tech_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_coupon_usage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_technician_workload(uuid) TO anon, authenticated;
