/*
# Create tuition_courses table — Vattams Online Tuition (Phase 2)

1. Purpose
   - Establishes the database foundation for Vattams Online Tuition, completely
     separate from all existing Home Services tables, auth, payments, technicians,
     customers, and admin logic.
   - This table will eventually replace the static data in
     src/pages/tuition/tuitionCoursesData.ts, but that file is left untouched in
     this step — this migration only creates the schema and seed data.

2. New Table: tuition_courses
   - id (uuid, primary key, default gen_random_uuid())
   - title (text, not null)
   - slug (text, unique, not null)
   - short_description (text)
   - description (text)
   - category (text, not null)
   - level (text)
   - mode (text, default 'online')
   - course_type (text, default 'one-to-one')
   - duration_minutes (integer)
   - classes_per_week (integer)
   - monthly_price (numeric)
   - trial_available (boolean, default true)
   - image_url (text)
   - is_active (boolean, default true)
   - display_order (integer, default 0)
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

3. Indexes
   - slug, category, is_active, display_order

4. Security (RLS)
   - Enable RLS on tuition_courses.
   - SELECT: public (anon + authenticated) — but only rows where is_active = true.
   - INSERT / UPDATE / DELETE: no public policies created. Nothing can write to
     this table via the anon/authenticated client keys. Admin write access will
     be added explicitly in a later Phase 2 step, following the same pattern
     used elsewhere in this project (e.g. service_prices).

5. Seed Data
   - Inserts a small starter set of courses matching the existing static
     category list (Spoken English, Abacus, School Tuition, Competitive Exam
     Preparation). Each row is inserted with ON CONFLICT (slug) DO NOTHING,
     so this migration is safe to run multiple times without erroring or
     duplicating rows.

6. Scope / Non-goals for this migration
   - Does not modify any existing table, migration, trigger, or RLS policy.
   - Does not touch Home Services, auth, payments, technician, customer, or
     admin schema/logic in any way.
   - Does not modify any React/TypeScript source files.

7. Note
   - This schema was already applied manually in the production Supabase
     SQL Editor. This file exists to bring the repository's migration
     history in sync with what is already live in production. Every
     statement below (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
     EXISTS, CREATE OR REPLACE FUNCTION, DROP ... IF EXISTS + CREATE
     TRIGGER, and ON CONFLICT DO NOTHING inserts) is idempotent and safe
     to re-run against a database where this schema already exists.
*/

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tuition_courses_slug ON tuition_courses(slug);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_category ON tuition_courses(category);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_is_active ON tuition_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_tuition_courses_display_order ON tuition_courses(display_order);

-- Row Level Security
ALTER TABLE tuition_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_active_tuition_courses" ON tuition_courses;
CREATE POLICY "public_select_active_tuition_courses" ON tuition_courses FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- No INSERT / UPDATE / DELETE policies are created here.
-- With RLS enabled and no write policies, all writes via the anon/authenticated
-- client keys are denied by default. Admin write access will be added in a
-- later, explicit step.

-- Auto-update updated_at on row change (tuition-specific trigger function;
-- does not reuse or modify any existing trigger function in this project)
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

-- Seed initial courses (idempotent — safe to run again; skips rows whose
-- slug already exists instead of relying on the table being empty)
INSERT INTO tuition_courses (
  title, slug, short_description, description, category, level, mode,
  course_type, duration_minutes, classes_per_week, monthly_price,
  trial_available, is_active, display_order
)
VALUES
  (
    'Spoken English',
    'spoken-english',
    'Build fluency, confidence, and correct pronunciation for everyday and academic communication.',
    'This course focuses on practical spoken English skills — pronunciation, vocabulary, grammar in conversation, and confident public speaking — through structured, interactive practice sessions.',
    'Spoken English',
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