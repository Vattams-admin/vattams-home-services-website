/*
 * KYC storage policy tightening.
 *
 * The bucket remains private and has no anon/authenticated SELECT policy.
 * Anonymous registration uploads are temporarily retained for compatibility,
 * but are limited to the exact KYC object-name convention. Anonymous overwrite
 * is removed; the browser must use create-only uploads.
 *
 * Follow-up security requirement: replace anonymous uploads with a
 * registration-OTP-bound, server-issued upload capability. The current
 * no-Supabase-Auth registration architecture cannot prove ownership of the
 * mobile-number folder from an anon Storage request alone.
 */
DROP POLICY IF EXISTS "anon_update_technician_docs" ON storage.objects;

DROP POLICY IF EXISTS "anon_insert_technician_docs" ON storage.objects;
CREATE POLICY "anon_insert_technician_docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'technician-docs'
  AND name ~ '^[6-9][0-9]{9}/(aadhaar|pan|dl)\.(jpg|jpeg|png|webp|pdf)$'
);

-- Defence in depth: no browser role may read private KYC objects.
DROP POLICY IF EXISTS "anon_select_technician_docs" ON storage.objects;
