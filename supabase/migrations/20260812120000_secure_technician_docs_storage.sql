/*
# Secure Technician Document Storage

## Problem
The `technician-docs` bucket created in
20260804003828_create_technician_docs_storage_bucket.sql was PUBLIC and had
an `anon_select_technician_docs` policy that let anyone read every
technician's Aadhaar / PAN / driving-licence file if they could guess or
enumerate the object path. Aadhaar and PAN are sensitive government ID
documents and must never be reachable via a public/unauthenticated URL.

## Fix
1. Flip `technician-docs` to a PRIVATE bucket and remove public read access
   entirely. Anon/authenticated keep INSERT + UPDATE only (upload / re-upload
   during registration, matching the existing no-auth-session registration
   flow) — there is no SELECT policy at all, so only the service_role
   (used from Edge Functions, which never ships to the frontend) can read
   these objects back, e.g. to mint a short-lived signed URL for admin
   review.
2. Create a separate PUBLIC `technician-photos` bucket for profile photos
   only. Profile photos are already rendered directly as `<img src=...>` in
   the technician dashboard, so they intentionally stay public — this just
   moves them out of the same bucket as the sensitive KYC documents.
3. This migration is additive/corrective — it does not drop the
   `technicians` table columns (`aadhaar_url`, `pan_url`, `dl_url`,
   `profile_photo_url`). Those columns are reused as-is:
   - `aadhaar_url` / `pan_url` / `dl_url` now store the private storage
     OBJECT PATH (e.g. `9876543210/aadhaar.jpg`), not a public URL.
   - `profile_photo_url` continues to store the full public URL, unchanged.

## Note on existing data
Any technician rows created while the bucket was public may have full
public URLs stored in aadhaar_url/pan_url/dl_url. Those URLs will stop
resolving once the bucket is private (expected — that is the point of this
fix). If any real applicants registered before this fix shipped, their KYC
files should be re-uploaded, or an admin should backfill the object path
manually from the storage dashboard.
*/

-- ============ 1. Lock down technician-docs (private) ============

UPDATE storage.buckets
SET public = false
WHERE id = 'technician-docs';

-- Remove the public/anon read policy — this is the actual security hole.
DROP POLICY IF EXISTS "anon_select_technician_docs" ON storage.objects;

-- Keep upload + re-upload working for the no-auth registration flow.
-- (These already exist from the previous migration; re-create idempotently
-- in case this migration runs standalone.)
DROP POLICY IF EXISTS "anon_insert_technician_docs" ON storage.objects;
CREATE POLICY "anon_insert_technician_docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'technician-docs');

DROP POLICY IF EXISTS "anon_update_technician_docs" ON storage.objects;
CREATE POLICY "anon_update_technician_docs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'technician-docs')
WITH CHECK (bucket_id = 'technician-docs');

-- Intentionally NO select policy for anon/authenticated on technician-docs.
-- Only the service_role (bypasses RLS) can read these objects, e.g. from
-- the technician-auth Edge Function to mint a signed URL for admin review.

-- ============ 2. New public bucket for profile photos only ============

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technician-photos',
  'technician-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_technician_photos" ON storage.objects;
CREATE POLICY "anon_select_technician_photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'technician-photos');

DROP POLICY IF EXISTS "anon_insert_technician_photos" ON storage.objects;
CREATE POLICY "anon_insert_technician_photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'technician-photos');

DROP POLICY IF EXISTS "anon_update_technician_photos" ON storage.objects;
CREATE POLICY "anon_update_technician_photos"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'technician-photos')
WITH CHECK (bucket_id = 'technician-photos');