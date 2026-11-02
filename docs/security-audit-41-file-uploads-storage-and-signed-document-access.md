# Security Audit 41 — File Uploads, Storage Buckets and Signed Document Access

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Technician KYC and profile-photo upload paths, Supabase Storage bucket configuration and policies, upload validation, object naming, admin document URL issuance and legacy storage migration.  
**Method:** Read-only inspection of repository source and migration SQL. No production Storage metadata, live policies, bucket contents or signed URL behavior was inspected.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository contains meaningful improvements: KYC documents were moved to a private bucket, anonymous KYC overwrite/read policies were removed in the latest tightening migration, and admin document access is gated by an active super-admin session with a five-minute signed URL. However, the upload boundary remains weak. Anonymous callers can still upload KYC objects under any syntactically valid mobile-number folder without proving ownership, and the public profile-photo bucket allows anonymous uploads and updates across the bucket. File validation is primarily browser-side and trusts client-provided MIME metadata rather than inspecting file signatures.

## Findings

### F41-01 — HIGH: Anonymous KYC upload is not bound to verified registration ownership

**Evidence**
- `20261031120000_tighten_technician_kyc_upload_policies.sql` allows `anon, authenticated` INSERT into `technician-docs` when the object name matches `^[6-9][0-9]{9}/(aadhaar|pan|dl)\.(jpg|jpeg|png|webp|pdf)$`.
- The migration comment explicitly states that the current no-Supabase-Auth registration architecture cannot prove ownership of the mobile-number folder and requires a registration-OTP-bound, server-issued upload capability.
- `src/lib/technicianRegistration.ts` constructs object paths directly from the caller-entered mobile number and document type.
- Upload requests carry only the public anon key; they do not include a verified registration capability.
- The policy is create-only after the latest migration, which prevents anonymous overwrites but does not establish ownership of the destination path.

**Risk**
An unauthenticated caller can attempt to reserve a valid mobile-number/document object path before its legitimate applicant uploads. Because uploads are create-only, a successful path reservation can block the applicant from uploading the correct document to that path. The caller can also create objects under another person's syntactically valid mobile-number folder. Private-bucket read restrictions reduce confidentiality exposure, but path squatting and upload denial remain.

**Required remediation**
- Replace direct anonymous Storage uploads with an Edge Function that validates a verified registration OTP/session and issues a narrowly scoped, short-lived upload capability.
- Bind the capability to the verified mobile number, allowed document type, exact object path, maximum size and expected content type.
- Enforce one-time use or explicit safe retry semantics without permitting arbitrary overwrite.
- Add abuse limits and cleanup for abandoned registration uploads.
- Test cross-mobile upload attempts and path-squatting in staging.

### F41-02 — HIGH: Public profile-photo bucket permits anonymous upload and overwrite across the bucket

**Evidence**
- `20260812120000_secure_technician_docs_storage.sql` creates `technician-photos` as a public bucket.
- The same migration grants `anon, authenticated` SELECT, INSERT and UPDATE for any object where `bucket_id = 'technician-photos'`.
- The INSERT/UPDATE policies do not bind the object path to a verified registration session or technician identity.
- `uploadDocumentWithProgress()` uses a predictable `{mobile}/profile_photo.{extension}` path.
- The browser upload uses the public anon key and does not use a server-issued upload token.

**Risk**
Any anonymous caller can upload arbitrary objects to the public photo bucket and, subject to the bucket's object policy and Storage API behavior, update/replace existing objects across the bucket if the path is known or guessed. Public object reads are intentional for profile rendering, but public read does not require public write. Malicious replacement of profile imagery can enable impersonation, offensive content, storage abuse and denial of service.

**Required remediation**
- Remove anonymous bucket-wide UPDATE; make profile uploads create-only unless a verified owner-bound replacement capability is used.
- Prefer a server-issued upload token bound to a verified mobile/technician ID and exact object key.
- Use random, non-guessable object names rather than predictable mobile-number paths.
- Validate the profile-photo content type and size server-side.
- Consider moderation/quarantine before publishing new profile photos.

### F41-03 — MEDIUM: Upload validation trusts browser MIME metadata and filename extension

**Evidence**
- `validateFile()` checks file size and `file.type` against a fixed allowlist in `src/lib/technicianRegistration.ts`.
- The extension is derived from `file.name` and appended to the storage object path.
- The XHR sets the Storage request's `Content-Type` directly from `file.type`.
- No server-side file-signature/magic-byte validation or content scanning is present in the inspected upload path.
- The bucket MIME allowlist is configured in the initial bucket-creation migration, but the current live bucket configuration was not inspected.

**Risk**
Browser-supplied MIME metadata and file extensions are not reliable proof of file contents. A crafted upload can claim an allowed MIME type while containing different content. Bucket MIME restrictions can help enforce metadata but do not independently prove the file signature or establish that the file is safe to open.

**Required remediation**
- Validate magic bytes and parse the actual file format server-side.
- Enforce size and MIME restrictions at the server/storage boundary, not only in the browser.
- Reject mismatched extension/content-type/signature combinations.
- Quarantine and scan uploads before admin viewing where practical.
- Serve documents with safe content-disposition and content-type headers; avoid inline rendering of untrusted formats unless required.

### F41-04 — MEDIUM: Legacy public KYC object URLs may remain in technician records and require migration verification

**Evidence**
- `20260812120000_secure_technician_docs_storage.sql` documents that records created while `technician-docs` was public may contain full public URLs in `aadhaar_url`, `pan_url` or `dl_url`.
- The same migration says these URLs should stop resolving after the bucket is made private and instructs that affected documents be re-uploaded or object paths backfilled.
- `technician-auth/index.ts` refuses to mint a signed URL when the stored value begins with `http://` or `https://`, returning HTTP 410 and requiring re-upload.
- No data migration or production record audit was performed in this review to establish that every legacy URL has been converted.

**Risk**
If any legacy public URL or cached/public object remains accessible, sensitive KYC information could remain exposed outside the new signed-URL path. Applicants with legacy URL values may also be unable to complete admin review until their documents are re-uploaded or backfilled.

**Required remediation**
- Inventory production technician KYC columns and storage objects.
- Confirm the bucket is private in production and legacy public URLs no longer return documents.
- Re-upload or safely backfill affected object paths.
- Purge public caches/CDN copies where applicable and retain evidence of verification.
- Do not expose legacy URLs in admin/customer/technician API responses.

### F41-05 — LOW/MEDIUM: Storage bucket configuration and effective production policy state are not independently verified

**Evidence**
- The initial `technician-docs` bucket migration uses `ON CONFLICT (id) DO NOTHING`, so reapplying it does not update an already existing bucket's size or MIME configuration.
- The later migration changes bucket privacy and policies, but no production Storage inspection is available in this source review.
- The `technician-photos` bucket creation also uses `ON CONFLICT (id) DO NOTHING`.
- Source SQL documents intended state; it does not prove that every migration has been applied successfully to the active Supabase project.

**Risk**
The live bucket's public flag, size limit, allowed MIME types and active policies may differ from repository expectations if migrations were skipped, partially applied or bucket configuration was changed manually. This is a verification gap, not proof of a live misconfiguration.

**Required remediation**
- Read-only inspect production `storage.buckets`, `storage.objects` policies and migration history.
- Compare actual values against the reviewed migration intent.
- Record a verified snapshot of bucket public flags, size limits, MIME allowlists and policies.
- Resolve drift through a separately authorized change plan; this audit makes no production changes.

## Positive controls observed

1. KYC documents are separated from public profile photos into different buckets.
2. `technician-docs` is explicitly changed to private in the security migration.
3. Anonymous SELECT on `technician-docs` is removed.
4. The latest KYC policy removes anonymous UPDATE and restricts INSERT to a fixed document-name convention.
5. The upload helper uses the public anon key and does not embed a service-role key.
6. KYC database fields are intended to store private object paths rather than public URLs.
7. The admin document URL endpoint checks an unexpired `admin_auth_sessions` token and active `super_admin` role.
8. The admin document URL endpoint selects the stored object path from the technician record rather than accepting an arbitrary storage path from the caller.
9. Signed KYC URLs are issued for 300 seconds (five minutes).
10. Legacy public URL values are rejected by the signed URL endpoint and require re-upload.

## Verification not performed

- No live Supabase bucket/policy/database inspection.
- No production migration-history verification.
- No upload penetration test or anonymous cross-mobile path-squatting test.
- No overwrite test against the public profile-photo bucket.
- No file-signature spoofing, polyglot, malformed PDF/image or malware scan test.
- No signed URL expiry/revocation/cache test.
- No audit of actual technician KYC object contents or legacy public URL exposure.
- No Cloudflare deployment, database mutation, SQL execution, GitHub Actions run or merge.

## Required release gates

1. Replace anonymous KYC uploads with verified, one-time, path-bound upload capabilities.
2. Remove public anonymous profile-photo writes and enforce owner-bound create/replace permissions.
3. Add server-side file signature, size and content validation.
4. Verify and remediate all legacy KYC URLs and public object exposure in production.
5. Independently verify live Storage bucket settings and RLS policies.

**Conclusion:** Audit 41 is complete as a repository-source review. The private KYC read boundary and five-minute admin signed-URL design are positive controls, but anonymous upload ownership is not proven and the public photo bucket has broad anonymous write/update policies. The marketplace remains **NOT PRODUCTION READY**.
