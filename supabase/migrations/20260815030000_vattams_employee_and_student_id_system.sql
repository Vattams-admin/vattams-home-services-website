/*
# VATTAMS Employee ID / Student ID System

## 1. Purpose
Adds a permanent, sequential, unique identifier to every approved
technician, every approved tutor, and every approved student:

  - Technicians : VATTAMS-TECH-0001, VATTAMS-TECH-0002, ...
  - Tutors      : VATTAMS-TUT-0001,  VATTAMS-TUT-0002,  ...
  - Students    : VATTAMS-STU-0001,  VATTAMS-STU-0002,  ...

IDs are assigned:
  a) Retroactively to existing rows that are already approved but do
     not yet have one (backfill, in registration order), and
  b) Automatically, at the database level, the moment a technician /
     tutor / student is (re-)approved in the future.

No existing table, column, RLS policy, or admin/auth mechanism is
modified. This migration only ADDS columns, indexes, sequences,
functions and triggers.

## 2. Tables touched (columns added only)
  - technicians      -> employee_id text (unique, nullable)
  - tuition_tutors    -> employee_id text (unique, nullable)
  - tuition_students  -> student_id  text (unique, nullable)

## 3. Why triggers, not application code
  - `technicians.status` is updated directly from the client
    (src/pages/AdminDashboard.tsx, allowed by the existing
    "public_update_technicians" RLS policy) — there is no single
    server-side chokepoint for technician approval.
  - `tuition_tutors.status` is updated only via the `tuition-tutor-admin`
    edge function (service_role key).
  - `tuition_students.status` is updated only via the
    `admin_update_tuition_student_status` SECURITY DEFINER RPC.
  A BEFORE INSERT OR UPDATE row trigger on each table is the only
  mechanism that is guaranteed to run no matter which of these paths
  performs the approval, so ID assignment cannot be bypassed or
  duplicated by adding a new admin surface later.

## 4. Permanence / idempotency
  - Each trigger only fills the ID column `WHEN (... IS NULL AND
    status = 'active'/'approved')`. Once set, the column is never
    touched again by the trigger — deactivating/suspending and later
    reactivating a technician, or any other status change, never
    regenerates or overwrites an existing ID.
  - Backfill only targets rows where the ID column IS NULL. Running
    this migration more than once is always safe (every statement
    uses IF NOT EXISTS / ON CONFLICT-safe guards, and re-running the
    backfill block is a no-op once every eligible row has an ID).

## 5. Concurrency safety
  IDs are generated from native PostgreSQL SEQUENCEs
  (`vattams_tech_employee_id_seq`, `vattams_tut_employee_id_seq`,
  `vattams_stu_student_id_seq`). `nextval()` is atomic under
  concurrent transactions by design — two simultaneous approvals can
  never receive the same number, even under heavy concurrent load,
  without needing any explicit application-level locking.

## 6. Detecting pre-existing IDs / continuing the sequence correctly
  Before backfilling, each sequence is fast-forwarded past the
  highest number already present in that column (matched via regex
  against the exact `VATTAMS-<PREFIX>-####` format). Since no
  technician/tutor/student in this project currently has an ID, this
  is a no-op today, but it makes the migration safe to re-run if IDs
  were ever partially assigned by hand, and guarantees existing IDs
  are never reused or overwritten.

## 7. Backfill ordering
  Existing eligible rows receive IDs in `created_at` (registration)
  order via an explicit PL/pgSQL loop, so ID number order matches
  real-world registration/approval history.
*/

-- ============================================================
-- 1. Columns
-- ============================================================

ALTER TABLE technicians ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE tuition_students ADD COLUMN IF NOT EXISTS student_id text;

-- Uniqueness (partial index: many NULLs are fine, no two non-null
-- values may ever collide).
CREATE UNIQUE INDEX IF NOT EXISTS idx_technicians_employee_id_unique
  ON technicians(employee_id) WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tuition_tutors_employee_id_unique
  ON tuition_tutors(employee_id) WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tuition_students_student_id_unique
  ON tuition_students(student_id) WHERE student_id IS NOT NULL;

-- ============================================================
-- 2. Sequences (one per prefix)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS vattams_tech_employee_id_seq;
CREATE SEQUENCE IF NOT EXISTS vattams_tut_employee_id_seq;
CREATE SEQUENCE IF NOT EXISTS vattams_stu_student_id_seq;

-- Fast-forward each sequence past the highest number already in use
-- (see note 6 above). Safe to re-run.
DO $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX(substring(employee_id from 'VATTAMS-TECH-(\d+)')::int), 0)
    INTO v_max
    FROM technicians
    WHERE employee_id ~ '^VATTAMS-TECH-\d+$';
  PERFORM setval('vattams_tech_employee_id_seq', GREATEST(v_max, 1), v_max > 0);

  SELECT COALESCE(MAX(substring(employee_id from 'VATTAMS-TUT-(\d+)')::int), 0)
    INTO v_max
    FROM tuition_tutors
    WHERE employee_id ~ '^VATTAMS-TUT-\d+$';
  PERFORM setval('vattams_tut_employee_id_seq', GREATEST(v_max, 1), v_max > 0);

  SELECT COALESCE(MAX(substring(student_id from 'VATTAMS-STU-(\d+)')::int), 0)
    INTO v_max
    FROM tuition_students
    WHERE student_id ~ '^VATTAMS-STU-\d+$';
  PERFORM setval('vattams_stu_student_id_seq', GREATEST(v_max, 1), v_max > 0);
END $$;

-- ============================================================
-- 3. Backfill existing already-approved rows that have no ID yet,
--    in registration order. Existing IDs (if any) are never touched
--    because the WHERE clause only ever matches employee_id/
--    student_id IS NULL.
-- ============================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Technicians: anyone who has ever been approved (active, or later
  -- made inactive/suspended after being active) but has no ID yet.
  -- 'pending' (never approved) and 'rejected' (never approved) are
  -- excluded — they will receive an ID automatically the moment they
  -- are approved, via the trigger below.
  FOR rec IN
    SELECT id FROM technicians
    WHERE employee_id IS NULL
      AND status IN ('active', 'inactive', 'suspended')
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE technicians
    SET employee_id = 'VATTAMS-TECH-' || lpad(nextval('vattams_tech_employee_id_seq')::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;

  -- Tutors: approved applications without an ID yet.
  FOR rec IN
    SELECT id FROM tuition_tutors
    WHERE employee_id IS NULL
      AND status = 'approved'
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE tuition_tutors
    SET employee_id = 'VATTAMS-TUT-' || lpad(nextval('vattams_tut_employee_id_seq')::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;

  -- Students: approved registrations without an ID yet.
  FOR rec IN
    SELECT id FROM tuition_students
    WHERE student_id IS NULL
      AND status = 'approved'
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE tuition_students
    SET student_id = 'VATTAMS-STU-' || lpad(nextval('vattams_stu_student_id_seq')::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ============================================================
-- 4. Triggers: auto-assign on every future approval
--    (BEFORE INSERT OR UPDATE, so it applies whether a row is
--    created already-approved or transitions into approved status
--    later, from any code path that writes to the table).
-- ============================================================

CREATE OR REPLACE FUNCTION assign_technician_employee_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.employee_id := 'VATTAMS-TECH-' || lpad(nextval('vattams_tech_employee_id_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_technician_employee_id ON technicians;
CREATE TRIGGER trg_assign_technician_employee_id
  BEFORE INSERT OR UPDATE ON technicians
  FOR EACH ROW
  WHEN (NEW.employee_id IS NULL AND NEW.status = 'active')
  EXECUTE FUNCTION assign_technician_employee_id();

CREATE OR REPLACE FUNCTION assign_tutor_employee_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.employee_id := 'VATTAMS-TUT-' || lpad(nextval('vattams_tut_employee_id_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_tutor_employee_id ON tuition_tutors;
CREATE TRIGGER trg_assign_tutor_employee_id
  BEFORE INSERT OR UPDATE ON tuition_tutors
  FOR EACH ROW
  WHEN (NEW.employee_id IS NULL AND NEW.status = 'approved')
  EXECUTE FUNCTION assign_tutor_employee_id();

CREATE OR REPLACE FUNCTION assign_student_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.student_id := 'VATTAMS-STU-' || lpad(nextval('vattams_stu_student_id_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_student_id ON tuition_students;
CREATE TRIGGER trg_assign_student_id
  BEFORE INSERT OR UPDATE ON tuition_students
  FOR EACH ROW
  WHEN (NEW.student_id IS NULL AND NEW.status = 'approved')
  EXECUTE FUNCTION assign_student_id();

-- ============================================================
-- 5. Indexes for admin list/lookup by ID
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_technicians_employee_id ON technicians(employee_id);
CREATE INDEX IF NOT EXISTS idx_tuition_tutors_employee_id ON tuition_tutors(employee_id);
CREATE INDEX IF NOT EXISTS idx_tuition_students_student_id ON tuition_students(student_id);