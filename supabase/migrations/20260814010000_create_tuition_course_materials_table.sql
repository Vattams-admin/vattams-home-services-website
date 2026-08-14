/*
# Create tuition_course_materials table — Vattams Online Tuition (Phase 5.1)

1. Purpose
   - Adds a dedicated Learning Materials table for the Online Tuition module,
     completely separate from all Home Services tables (bookings, technicians,
     customers, payments, admin, etc.) and from the tuition_courses table
     itself (no columns/policies on tuition_courses are touched).
   - Replaces the hard-coded `materials` demo data in
     src/pages/tuition/tuitionCoursesData.ts with a real, per-course,
     course-wise catalog of downloadable/linkable materials.

2. Course reference: course_slug (text), not course_id (uuid)
   - The running frontend resolves a course purely by its static `slug`
     (see src/lib/router.tsx + tuitionCoursesData.getTuitionCourseBySlug) —
     it does not currently look up tuition_courses by id. Keying materials
     by course_slug (referencing tuition_courses.slug) keeps this table
     usable immediately by the existing course pages without first wiring
     the course catalog itself to Supabase, and without inventing a
     course_id the frontend has no way to obtain yet. This can be swapped
     for a uuid course_id FK later with a straightforward migration once
     the course catalog itself moves off static data.

3. New Table: tuition_course_materials
   - id uuid primary key default gen_random_uuid()
   - course_slug text not null, references tuition_courses(slug)
   - title text not null
   - description text
   - category text not null, constrained to the 9 supported categories
     (matches keys(CourseMaterials) in tuitionCoursesData.ts exactly:
     courseMaterials, studyMaterials, worksheets, questionBanks, testPapers,
     mockExams, solutions, revisionMaterials, examPreparation)
   - subject text
   - topic text
   - grade text
   - resource_url text (direct downloadable file)
   - external_url text (external link, distinct from a downloadable file)
   - file_type text
   - file_size bigint (bytes, nullable — not always knowable)
   - is_published boolean default false
   - created_at / updated_at timestamptz

4. Indexes
   - course_slug, category, is_published, and a composite
     (course_slug, category, is_published) matching the primary read
     pattern: "published materials for this course, in this category".

5. Security (RLS)
   - Enable RLS.
   - SELECT: public (anon + authenticated), but only rows where
     is_published = true — mirrors the existing tuition_courses read
     policy and the project's "students/public read only published
     content" access model.
   - INSERT / UPDATE / DELETE: no public policies created. As with
     tuition_courses, nothing can write to this table via the
     anon/authenticated client keys. This is intentional: Phase 5.1 is
     read-only foundation. Phase 5.2 will add explicit tutor/admin write
     access (e.g. via an authenticated role check or an edge function
     using the service_role key server-side), following the same pattern
     used elsewhere in this project (service_prices, admin tables). No
     service_role key is ever added to frontend code.

6. Scope / Non-goals for this migration
   - Does not modify any existing table, migration, trigger, or RLS policy
     — including tuition_courses, which is only referenced via FK.
   - Does not touch Home Services, auth, payments, technician, customer,
     or admin schema/logic in any way.
   - Does not modify any React/TypeScript source files (done separately).

7. Idempotency
   - Every statement below (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
     EXISTS, CREATE OR REPLACE FUNCTION, DROP ... IF EXISTS + CREATE
     TRIGGER/POLICY) is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS tuition_course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug text NOT NULL REFERENCES tuition_courses(slug) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (
    category IN (
      'courseMaterials',
      'studyMaterials',
      'worksheets',
      'questionBanks',
      'testPapers',
      'mockExams',
      'solutions',
      'revisionMaterials',
      'examPreparation'
    )
  ),
  subject text,
  topic text,
  grade text,
  resource_url text,
  external_url text,
  file_type text,
  file_size bigint,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tuition_course_materials_course_slug
  ON tuition_course_materials(course_slug);
CREATE INDEX IF NOT EXISTS idx_tuition_course_materials_category
  ON tuition_course_materials(category);
CREATE INDEX IF NOT EXISTS idx_tuition_course_materials_is_published
  ON tuition_course_materials(is_published);
CREATE INDEX IF NOT EXISTS idx_tuition_course_materials_course_category_published
  ON tuition_course_materials(course_slug, category, is_published);

-- Row Level Security
ALTER TABLE tuition_course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_published_tuition_materials" ON tuition_course_materials;
CREATE POLICY "public_select_published_tuition_materials" ON tuition_course_materials FOR SELECT
  TO anon, authenticated USING (is_published = true);

-- No INSERT / UPDATE / DELETE policies are created here.
-- With RLS enabled and no write policies, all writes via the anon/authenticated
-- client keys are denied by default. Tutor/Admin write access will be added in
-- Phase 5.2, following the same pattern used elsewhere in this project.

-- Auto-update updated_at on row change (materials-specific trigger function;
-- does not reuse or modify any existing trigger function in this project)
CREATE OR REPLACE FUNCTION update_tuition_course_materials_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_course_materials_updated_at ON tuition_course_materials;
CREATE TRIGGER tuition_course_materials_updated_at
  BEFORE UPDATE ON tuition_course_materials
  FOR EACH ROW EXECUTE FUNCTION update_tuition_course_materials_updated_at();

-- No seed data: real material files/links don't exist yet, and this project's
-- convention (see tuitionCoursesData.ts) is to never fabricate resource URLs.
-- An empty table renders correctly via the "No materials available yet" state.