/*
# Tuition Materials Watermark Storage — Vattams Online Tuition (Phase 5.1 — Step 2)

## Purpose
Adds the two storage buckets required by the PDF watermarking pipeline for
`tuition_course_materials`. This migration only creates storage buckets and
storage.objects RLS policies — it does not alter tuition_course_materials,
tuition_courses, or any Home Services table.

## Buckets

1. `tuition-materials-originals` (PRIVATE)
   - Holds the original, un-watermarked source PDF a tutor/admin uploads.
   - No SELECT / INSERT / UPDATE / DELETE policy is created for anon or
     authenticated here. With RLS enabled and no matching policy, the
     anon/authenticated client keys cannot read or write this bucket at
     all — it is reachable only from the `tuition-watermark-pdf` Edge
     Function, which uses the service_role key server-side (service_role
     bypasses RLS by design; it is never shipped to the frontend). This is
     the same "private-by-having-no-policy" pattern already used for the
     `technician-docs` bucket (see
     20260812120000_secure_technician_docs_storage.sql).

2. `tuition-materials-protected` (PUBLIC READ ONLY)
   - Holds the watermarked/protected PDF that is actually served to
     students. Public SELECT so `resource_url` (a plain https URL, per
     src/lib/tuitionMaterials.ts's sanitizeUrl) works directly in the
     browser/download link — mirrors how `technician-photos` is public for
     the same "must render via a plain URL" reason.
   - No INSERT / UPDATE / DELETE policy for anon or authenticated: only the
     `tuition-watermark-pdf` Edge Function (service_role) can write into
     this bucket. Students/public can only ever read an already-generated
     watermarked file — they can never upload, replace, or read the
     original.

## Non-goals
Does not touch tuition_course_materials, tuition_courses, or any other
table/bucket/policy in this project.
*/

-- ============ 1. Private bucket: original source PDFs ============

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tuition-materials-originals',
  'tuition-materials-originals',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Intentionally NO SELECT / INSERT / UPDATE / DELETE policy for
-- anon/authenticated on tuition-materials-originals. Only service_role
-- (used from the tuition-watermark-pdf Edge Function) can read or write
-- this bucket. This is what makes the original "stored privately, never
-- publicly accessible".

-- ============ 2. Public bucket: watermarked/protected PDFs ============

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tuition-materials-protected',
  'tuition-materials-protected',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_select_tuition_materials_protected" ON storage.objects;
CREATE POLICY "public_select_tuition_materials_protected"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'tuition-materials-protected');

-- Intentionally NO INSERT / UPDATE / DELETE policy for anon/authenticated
-- on tuition-materials-protected. Only service_role (the
-- tuition-watermark-pdf Edge Function) can write watermarked files here.
-- Students/public get read-only access to the already-watermarked output.