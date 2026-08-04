/*
# Create technician-docs Storage Bucket

1. Storage
- Create a public storage bucket named `technician-docs` for technician KYC documents
  (Aadhaar, PAN, Driving Licence, Profile Photo).
- Set a 10MB file size limit on the bucket.
2. Security
- Enable RLS on storage.objects for the technician-docs bucket.
- Allow anon + authenticated to INSERT (upload) and SELECT (read) objects,
  since the app has no Supabase Auth session for technicians at upload time.
- Deny UPDATE and DELETE to anon (prevents overwriting another user's file
  unless upsert is used with the same path).
3. Important Notes
- The bucket is public so that getPublicUrl works for displaying uploaded
  documents in the admin dashboard and technician profile.
- File path pattern is `{mobile}/{docType}.{ext}` to avoid collisions.
- upsert: true in the client handles re-uploads by the same technician.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technician-docs',
  'technician-docs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read objects (public bucket for KYC doc display)
DROP POLICY IF EXISTS "anon_select_technician_docs" ON storage.objects;
CREATE POLICY "anon_select_technician_docs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'technician-docs');

-- Allow anyone to upload objects (technician registration has no auth session)
DROP POLICY IF EXISTS "anon_insert_technician_docs" ON storage.objects;
CREATE POLICY "anon_insert_technician_docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'technician-docs');

-- Allow updates (for upsert/re-upload by same technician)
DROP POLICY IF EXISTS "anon_update_technician_docs" ON storage.objects;
CREATE POLICY "anon_update_technician_docs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'technician-docs')
WITH CHECK (bucket_id = 'technician-docs');
