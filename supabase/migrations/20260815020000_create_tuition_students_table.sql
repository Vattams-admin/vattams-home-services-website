/*
# Create tuition_students table + admin RPCs — Vattams Online Tuition
  (Student Registration)

1. Root cause this migration fixes
   - Admin Dashboard -> Tuition -> Students shows "Could not load student
     registrations. Please try again." because
     src/components/tuition/admin/TuitionAdminStudents.tsx (and the stats
     widget in TuitionAdminPanel.tsx) call `supabase.rpc(
     'admin_list_tuition_students', ...)`, but neither that function nor
     any backing table has ever existed in this project's migrations.
     Postgres returns "function admin_list_tuition_students does not
     exist", which the client correctly catches and shows as a generic
     error (it already does `console.error(...)` before that, per the
     existing code).
   - Separately, src/pages/tuition/TuitionBooking.tsx (the public Student
     Registration form) never called Supabase at all — it only sets local
     React state to show the "Tuition Request Submitted" screen. No
     student registration was ever persisted, for any student, ever. This
     migration adds the table that a matching client-side fix
     (src/lib/tuitionStudents.ts) inserts into.

2. New table: tuition_students
   - Mirrors the fields the Admin Students UI already expects
     (see the TuitionStudent interface in TuitionAdminStudents.tsx) and
     the fields actually collected by TuitionBooking.tsx's FormData:
     studentName, parentName, phone, email, city, course, mode, date,
     time, message.
   - status: pending | approved | rejected (default pending), matching
     the tuition_tutors status pattern already used in this project.
   - Completely separate from every other table (bookings, technicians,
     customers, tuition_tutors, tuition_courses, tuition_course_materials,
     etc). No existing table, column, trigger, or policy is modified.

3. Security (RLS)
   - Enable RLS.
   - INSERT: public (anon + authenticated) may insert their own
     registration — this is the only public-facing action, matching the
     public_insert_tuition_tutors policy pattern.
   - No public SELECT / UPDATE / DELETE policies. Admin read/write goes
     exclusively through the two SECURITY DEFINER RPC functions below,
     which verify the caller's admin id against the existing `admins`
     table before touching any row (matches the p_admin_id pattern already
     called by both TuitionAdminStudents.tsx and TuitionAdminPanel.tsx).

4. New RPC functions
   - admin_list_tuition_students(p_admin_id uuid, p_status text)
     Returns all columns the client expects, optionally filtered by
     status, newest first. Raises an exception (caught client-side as
     rpcError) if p_admin_id is not a valid row in `admins`.
   - admin_update_tuition_student_status(p_admin_id uuid, p_student_id
     uuid, p_status text)
     Updates one row's status (approved/rejected) after the same admin
     check, and returns the updated row.

5. Scope / Non-goals
   - Does not modify any existing table, migration, trigger, RLS policy,
     Technician table/flow, or Tutor table/flow.
   - Does not touch the `admins` or `admin_sessions` tables — only reads
     from `admins` to verify the caller.
   - No seed data: this table holds real student registrations only.

6. Idempotency
   - Every statement below is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS tuition_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_name text NOT NULL,
  parent_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  city text NOT NULL,
  course text NOT NULL,
  class_mode text NOT NULL DEFAULT 'Online One-to-One',
  preferred_date date,
  preferred_time text,
  message text,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for the admin list/filter view (status tabs + recency ordering)
CREATE INDEX IF NOT EXISTS idx_tuition_students_status ON tuition_students(status);
CREATE INDEX IF NOT EXISTS idx_tuition_students_created_at ON tuition_students(created_at DESC);

-- Row Level Security
ALTER TABLE tuition_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_tuition_students" ON tuition_students;
CREATE POLICY "public_insert_tuition_students" ON tuition_students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- No SELECT / UPDATE / DELETE policies are created here. With RLS enabled
-- and no such policies, all reads/updates/deletes via the anon/authenticated
-- client keys are denied by default. Admin access is exclusively through
-- the two SECURITY DEFINER RPC functions below.

-- Auto-update updated_at on row change (student-specific trigger function;
-- does not reuse or modify any existing trigger function in this project)
CREATE OR REPLACE FUNCTION update_tuition_students_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_students_updated_at ON tuition_students;
CREATE TRIGGER tuition_students_updated_at
  BEFORE UPDATE ON tuition_students
  FOR EACH ROW EXECUTE FUNCTION update_tuition_students_updated_at();

-- Admin: list student registrations (optionally filtered by status)
CREATE OR REPLACE FUNCTION admin_list_tuition_students(
  p_admin_id uuid,
  p_status text DEFAULT NULL
)
RETURNS SETOF public.tuition_students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.tuition_students
    WHERE p_status IS NULL OR status = p_status
    ORDER BY created_at DESC;
END;
$$;

-- Admin: approve/reject a student registration
CREATE OR REPLACE FUNCTION admin_update_tuition_student_status(
  p_admin_id uuid,
  p_student_id uuid,
  p_status text
)
RETURNS SETOF public.tuition_students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  RETURN QUERY
    UPDATE public.tuition_students
    SET status = p_status
    WHERE id = p_student_id
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_tuition_students(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_tuition_student_status(uuid, uuid, text) TO anon, authenticated;