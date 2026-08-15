/*
# Create tuition_tutors table — Vattams Online Tuition (Tutor Registration)

1. Purpose
   - Stores tutor applications submitted via
     src/components/tuition/tutor/TuitionTutorRegister.tsx.
   - Completely separate from all Home Services tables (bookings,
     technicians, customers, payments, admin, etc.) and from every other
     Tuition table (tuition_courses, tuition_course_materials). No existing
     table, column, trigger, or policy is modified by this migration.

2. Columns
   - Mirrors the fields actually collected by TuitionTutorRegister.tsx today
     (TutorFormData). No Aadhaar/PAN/bank fields are collected by that form
     yet — the "Qualification & Verification Documents" section is present
     but explicitly disabled ("Coming soon") in the current UI, so no
     document/KYC columns are created in this migration. When document
     upload is implemented, KYC/bank fields should follow the same private
     pattern already used for technicians (technician-docs private bucket +
     service_role-only read), never a public column.
   - status: pending | approved | rejected (default pending)
   - reviewed_at / reviewed_by_email: set by the admin approval edge
     function, not by the public client.

3. Security (RLS)
   - Enable RLS.
   - INSERT: public (anon + authenticated) may insert a new application.
     This is the only public-facing action — tutors are submitting their
     own application and do not need to read it back (the client checks
     the insert response for an error, not by reading the row back).
   - SELECT / UPDATE / DELETE: no public policies. Nobody can read or
     modify tutor applications using the anon/authenticated client keys.
     Admin listing + approve/reject is handled exclusively by the
     `tuition-tutor-admin` edge function using the service_role key,
     which verifies the caller is an active super_admin from admin_users
     before touching this table. This is intentionally stricter than the
     existing `technicians` table (which has a public_select_technicians
     USING(true) policy) because this application explicitly asks for
     tutor data to not be publicly readable.

4. Scope / Non-goals for this migration
   - Does not modify any existing table, migration, trigger, RLS policy,
     or the technicians/admin schema.
   - Does not create any FK reference to admin_users/admin_sessions/admins,
     since those tables are not defined consistently across this project's
     migration history (see conversation notes) — this migration must not
     depend on their exact shape to apply cleanly.
   - Does not modify any React/TypeScript source files (done separately).

5. Idempotency
   - Every statement below is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS tuition_tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name text NOT NULL,
  date_of_birth date,
  gender text,
  phone text NOT NULL,
  whatsapp text,
  email text NOT NULL,
  city text NOT NULL,
  state text,

  highest_qualification text NOT NULL,
  institution text,
  years_experience text,
  classes_can_teach text,
  teaching_languages text,
  teaching_mode text,

  subjects text[] NOT NULL DEFAULT '{}',
  exam_prep text[] NOT NULL DEFAULT '{}',

  introduction text,
  teaching_approach text,
  availability text,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by_email text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for the admin list/filter view (status tabs + recency ordering)
CREATE INDEX IF NOT EXISTS idx_tuition_tutors_status ON tuition_tutors(status);
CREATE INDEX IF NOT EXISTS idx_tuition_tutors_created_at ON tuition_tutors(created_at DESC);

-- Row Level Security
ALTER TABLE tuition_tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_tuition_tutors" ON tuition_tutors;
CREATE POLICY "public_insert_tuition_tutors" ON tuition_tutors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- No SELECT / UPDATE / DELETE policies are created here. With RLS enabled
-- and no such policies, all reads/updates/deletes via the anon/authenticated
-- client keys are denied by default. Admin access goes through the
-- tuition-tutor-admin edge function (service_role key, server-side only).

-- Auto-update updated_at on row change (tutor-specific trigger function;
-- does not reuse or modify any existing trigger function in this project)
CREATE OR REPLACE FUNCTION update_tuition_tutors_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_tutors_updated_at ON tuition_tutors;
CREATE TRIGGER tuition_tutors_updated_at
  BEFORE UPDATE ON tuition_tutors
  FOR EACH ROW EXECUTE FUNCTION update_tuition_tutors_updated_at();

-- No seed data: this table holds real tutor applications only.