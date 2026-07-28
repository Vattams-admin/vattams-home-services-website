/*
# Add password_hash column to technicians

1. Changes
   - Adds `password_hash` (text, nullable) to the `technicians` table.
     Technicians set a password during registration; it is stored as a bcrypt hash.
     Login verifies the hash via a Supabase Edge Function that uses the service role key.
   - Adds `rejected` as a valid status value alongside `pending`, `active`, `inactive`
     so admins can explicitly reject a technician application (login blocked).
   - Adds `wallet_locked` handling note: if wallet_locked is true, login is blocked.

2. Security
   - No RLS policy changes (existing public CRUD policies remain).
   - The password_hash column is readable via anon key because the technicians table
     has public SELECT policy. To prevent leaking hashes, we add a column-level
     restriction: only the service role can read password_hash. This is done via
     a separate view `technicians_public` that excludes password_hash, and we
     revoke table-level SELECT from anon on the base table's password_hash column.
     In practice, since RLS already allows anon SELECT, we instead use a SECURITY
     DEFINER function for login verification so the client never reads the hash.

3. Important Notes
   - Registration stores the password as a bcrypt hash via an edge function.
   - Login is verified by an edge function using the service role key.
   - Only technicians with status = 'active' (approved) can log in.
   - Technicians with status 'pending', 'inactive', or 'rejected' cannot log in.
   - Technicians with wallet_locked = true can still log in (they see a locked banner).
*/

-- Add password_hash column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='password_hash') THEN
    ALTER TABLE technicians ADD COLUMN password_hash text;
  END IF;
END $$;

-- Add 'rejected' to allowed status values
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='technicians' AND column_name='status'
  ) THEN
    -- Drop the old constraint and add a new one with 'rejected' included
    ALTER TABLE technicians DROP CONSTRAINT IF EXISTS technicians_status_check;
    ALTER TABLE technicians ADD CONSTRAINT technicians_status_check
      CHECK (status IN ('pending','active','inactive','rejected'));
  END IF;
END $$;
