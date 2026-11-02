/*
 * Revoke legacy browser-role access to technician KYC objects.
 *
 * Production audit confirmed multiple permissive policies on storage.objects
 * that grant anon/authenticated bucket-wide SELECT, INSERT, and UPDATE access.
 * This migration removes every known legacy policy name, including policies
 * created by older migrations and dashboard/manual changes.
 *
 * IMPORTANT:
 * - Keep technician-docs private.
 * - Do not delete, move, or rewrite existing Storage objects.
 * - Do not recreate anon/authenticated KYC policies.
 * - Trusted service-role Edge Functions may continue to access the bucket.
 * - Deploy the registration-bound server-side upload endpoint and update the
 *   registration frontend before applying this migration in production;
 *   direct browser uploads will intentionally stop working after it applies.
 *
 * This migration is idempotent and only changes bucket metadata and policies.
 */

UPDATE storage.buckets
SET public = false
WHERE id = 'technician-docs';

-- Remove the six broad policy names confirmed in the live production audit.
DROP POLICY IF EXISTS "technician_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "technician_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "technician_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "Allow technician document uploads" ON storage.objects;
DROP POLICY IF EXISTS "anon_insert_technician_docs" ON storage.objects;
DROP POLICY IF EXISTS "anon_update_technician_docs" ON storage.objects;

-- Also remove the older public-read policy name if it exists.
DROP POLICY IF EXISTS "anon_select_technician_docs" ON storage.objects;

-- No anon/authenticated SELECT, INSERT, or UPDATE policy is recreated.
-- Edge Functions using the service role are the only intended KYC access path.
