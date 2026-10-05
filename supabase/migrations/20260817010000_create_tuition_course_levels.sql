/*
# Phase T1 — Course + Level foundation (Online Tuition)

## 1. Purpose
Adds a reusable Course -> Level structure for the Online Tuition module,
starting with Abacus and Public Speaking (the renamed "Spoken English").
This is foundation only: no batches, enrollment, attendance, payments,
live classes, or certificates are created here.

## 2. Why this migration also re-declares tuition_courses
The table was originally introduced by
supabase/migrations/supabase/migrations/20260813010000_create_tuition_courses_table.sql
— a file sitting in a nested, incorrectly-pathed directory
(supabase/migrations/supabase/migrations/...) that standard Supabase
migration tooling does not scan from supabase/migrations/. That file's
own header states the schema "was already applied manually in the
production Supabase SQL Editor."

This project has no live database credentials available to query
information_schema and confirm that directly from here, so this
migration is written to be correct in BOTH possible states:
  - If tuition_courses already exists in production: every statement
    below is a no-op against it (CREATE TABLE IF NOT EXISTS, CREATE
    INDEX IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY,
    CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS + CREATE
    TRIGGER, INSERT ... ON CONFLICT (slug) DO NOTHING).
  - If it does not exist yet: this migration creates it with the exact
    same shape as the orphaned file, so the repo's tracked migration
    history and the live schema converge, without duplicating the
    table definition under a different name.
The orphaned nested file itself is NOT modified, moved, or deleted by
this migration, per explicit instruction — cleanup is deferred to a
separate later phase.

## 3. Course name change: Spoken English -> Public Speaking
- The slug 'spoken-english' is NOT changed. tuition_course_materials
  has a foreign key on tuition_courses(slug) with ON DELETE CASCADE
  and no ON UPDATE CASCADE, so changing the slug would either break
  that FK or require a coordinated multi-table update. Keeping the
  slug avoids that risk entirely.
- Only the display fields (title, category) on the existing
  'spoken-english' row are updated to "Public Speaking". This is a
  targeted UPDATE of a catalog/display row, not a rewrite of any
  student or tutor's historical submission — tuition_students.course
  and tuition_tutors.subjects are untouched by this migration and
  keep whatever value ("Spoken English" or otherwise) was recorded
  at submission time.
- The UPDATE is idempotent (guarded by a WHERE ... IS DISTINCT FROM
  check) and only fires if a 'spoken-english' row exists — if
  tuition_courses did not exist before this migration, the preceding
  seed INSERT creates the row already titled "Public Speaking", so
  the UPDATE is a no-op either way.

## 4. New table: tuition_course_levels
- One row per (course, level), keyed by course_slug (matching the
  existing course_slug-keyed pattern already used by
  tuition_course_materials, rather than inventing a course_id
  convention this project doesn't otherwise use yet).
- Seeded for the two courses this phase concerns:
    abacus         -> Foundation, Beginner, Intermediate, Advanced
    spoken-english -> Foundation, Intermediate, Advanced
  No other course gets a levels row in this migration — Abacus and
  Public Speaking already exist as courses; nothing here creates a
  duplicate course.
- RLS: public SELECT of active levels only, matching the existing
  tuition_courses read policy. No public INSERT/UPDATE/DELETE.

## 5. Explicitly NOT done in this migration
- No batches, enrollment, attendance, payment, live-class, or
  certificate tables.
- No DELETE, TRUNCATE, or DROP of any kind.
- No change to tuition_students, tuition_tutors, their RLS, their
  triggers, or the employee/student ID sequences/triggers.
- No change to any Home Services table.
- No change to the orphaned nested migration file.

## 6. Idempotency
Every statement in this file is safe to run more than once.
*/

-- ---------------------------------------------------------------------
-- 1. Ensure tuition_courses exists (no-op if already applied in prod)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tuition_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  description text,
  category text NOT NULL,
  level text,
  mode text DEFAULT 'online',
  course_type text DEFAULT 'one-to-one',
  duration_minutes integer,
  classes_per_week integer,
  monthly_price numeric(10,2),
  trial_available boolean DEFAULT true,
  image_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_courses_slug ON tuition_courses(slug);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_category ON tuition_courses(category);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_is_active ON tuition_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_display_order ON tuition_courses(display_order);

ALTER TABLE tuition_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_active_tuition_courses" ON tuition_courses;
CREATE POLICY "public_select_active_tuition_courses" ON tuition_courses FOR SELECT
  TO anon, authenticated USING (is_active = true);

CREATE OR REPLACE FUNCTION update_tuition_courses_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_courses_updated_at ON tuition_courses;
CREATE TRIGGER tuition_courses_updated_at
  BEFORE UPDATE ON tuition_courses
  FOR EACH ROW EXECUTE FUNCTION update_tuition_courses_updated_at();

-- Seed courses (matches the orphaned migration's seed exactly, so that
-- if it was never actually applied, this converges to the same state).
-- 'Spoken English' is inserted with its final display name directly —
-- see note (3) above for why this is not a rewrite of historical data.
INSERT INTO tuition_courses (
  title, slug, short_description, description, category, level, mode,
  course_type, duration_minutes, classes_per_week, monthly_price,
  trial_available, is_active, display_order
)
VALUES
  (
    'Public Speaking',
    'spoken-english',
    'Build fluency, confidence, and correct pronunciation for everyday and academic communication.',
    'This course focuses on practical spoken English and public speaking skills — pronunciation, vocabulary, grammar in conversation, and confident presentation — through structured, interactive practice sessions.',
    'Public Speaking',
    'All Levels',
    'online',
    'small-group',
    45,
    3,
    1999.00,
    true,
    true,
    1
  ),
  (
    'Abacus & Mental Arithmetic',
    'abacus',
    'Develop mental math speed, accuracy, and concentration using the abacus method.',
    'Our Abacus program builds strong mental arithmetic ability in young learners through a structured, level-based curriculum, improving calculation speed, memory, and focus.',
    'Abacus',
    'Beginner',
    'online',
    'small-group',
    45,
    2,
    1499.00,
    true,
    true,
    2
  ),
  (
    'School Tuition (All Subjects)',
    'school-tuition',
    'Personalized, subject-wise support for school students to build strong fundamentals and stay on top of schoolwork.',
    'Our School Tuition program gives students dedicated academic support aligned with their school syllabus. Sessions are tailored to each student''s pace, covering homework help, concept clarity, and exam readiness across core subjects.',
    'School Tuition',
    'Class 1 - Class 10',
    'online',
    'one-to-one',
    60,
    4,
    2999.00,
    true,
    true,
    3
  ),
  (
    'Competitive Exam Preparation',
    'competitive-exam-preparation',
    'Focused preparation for competitive entrance and scholarship exams.',
    'This program prepares students for competitive exams through structured content coverage, timed practice tests, and strategy sessions designed to build both accuracy and speed.',
    'Competitive Exam Preparation',
    'Class 8 and above',
    'online',
    'small-group',
    60,
    3,
    2499.00,
    true,
    true,
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- If tuition_courses already existed in production with the old title,
-- bring the display fields for the 'spoken-english' row up to date.
-- Guarded so it only touches that one row, only if it's still on the
-- old name, and never touches id/slug/created_at.
UPDATE tuition_courses
SET title = 'Public Speaking',
    category = 'Public Speaking'
WHERE slug = 'spoken-english'
  AND (title IS DISTINCT FROM 'Public Speaking' OR category IS DISTINCT FROM 'Public Speaking');

-- ---------------------------------------------------------------------
-- 2. New table: tuition_course_levels
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tuition_course_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug text NOT NULL REFERENCES tuition_courses(slug) ON DELETE CASCADE,
  level_name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_slug, level_name)
);

CREATE INDEX IF NOT EXISTS idx_tuition_course_levels_course_slug ON tuition_course_levels(course_slug);
CREATE INDEX IF NOT EXISTS idx_tuition_course_levels_is_active ON tuition_course_levels(is_active);
CREATE INDEX IF NOT EXISTS idx_tuition_course_levels_course_active_order
  ON tuition_course_levels(course_slug, is_active, display_order);

ALTER TABLE tuition_course_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_active_tuition_course_levels" ON tuition_course_levels;
CREATE POLICY "public_select_active_tuition_course_levels" ON tuition_course_levels FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- No public INSERT/UPDATE/DELETE policies. Admin write access, if
-- needed later, follows the same pattern as tuition_courses (added
-- explicitly in its own step, never via the anon/authenticated keys).

CREATE OR REPLACE FUNCTION update_tuition_course_levels_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_course_levels_updated_at ON tuition_course_levels;
CREATE TRIGGER tuition_course_levels_updated_at
  BEFORE UPDATE ON tuition_course_levels
  FOR EACH ROW EXECUTE FUNCTION update_tuition_course_levels_updated_at();

-- Seed levels (idempotent — ON CONFLICT (course_slug, level_name) DO NOTHING)
INSERT INTO tuition_course_levels (course_slug, level_name, display_order)
VALUES
  ('abacus', 'Foundation', 1),
  ('abacus', 'Beginner', 2),
  ('abacus', 'Intermediate', 3),
  ('abacus', 'Advanced', 4),
  ('spoken-english', 'Foundation', 1),
  ('spoken-english', 'Intermediate', 2),
  ('spoken-english', 'Advanced', 3)
ON CONFLICT (course_slug, level_name) DO NOTHING;