# Security Audit 89 — File Uploads, Document Validation, Storage Access, Malicious Files and Upload Ownership

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Reviewed source commit:** `dbba5f9d27cee7ed3ec43db72aaf6d7a25635303`  
**Review type:** Read-only source, storage-policy and migration review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**New distinct findings: 0. Three material upload risks remain open and are carried forward from Audit 41 / Audit 78.**

The latest migration, `20261031120000_tighten_technician_kyc_upload_policies.sql`, is a meaningful improvement: it removes anonymous UPDATE on the private KYC bucket and constrains anonymous INSERT object names to the expected mobile/document/extension pattern. The KYC bucket remains private with no browser-role SELECT policy. The admin document endpoint continues to issue five-minute signed URLs only after checking an unexpired admin session and active super-admin status.

However, the migration explicitly retains anonymous KYC INSERT without proving that the caller controls the mobile number in the object path. The public profile-photo bucket still has broad anonymous INSERT and UPDATE policies. Upload validation remains client-side and trusts caller-supplied MIME metadata and filename extension; no server-side signature inspection, parser hardening or malware quarantine/scanning was evidenced in the inspected path.

These issues are already documented in Audit 41 and Audit 78, so this audit does not inflate the finding count by relabelling them as new defects.

## Scope and evidence reviewed

Reviewed at the stated branch/source commit:

- `src/lib/technicianRegistration.ts`
- `src/pages/TechnicianRegister.tsx`
- `supabase/migrations/20260804003828_create_technician_docs_storage_bucket.sql`
- `supabase/migrations/20260812120000_secure_technician_docs_storage.sql`
- `supabase/migrations/20261031120000_tighten_technician_kyc_upload_policies.sql`
- `supabase/functions/technician-auth/index.ts`
- `docs/security-audit-41-file-uploads-storage-and-signed-document-access.md`
- `docs/security-audit-78-storage-uploads-kyc-document-security-and-signed-url-exposure.md`

## Controls confirmed in source

### 1. Private KYC read boundary

The security migration sets `technician-docs` to private and drops the anonymous SELECT policy. The latest tightening migration again drops any `anon_select_technician_docs` policy. The reviewed migrations do not create a browser-role SELECT policy for this bucket.

### 2. KYC object-name restriction and create-only anonymous access

The 2026-10-31 migration drops `anon_update_technician_docs` and recreates the anonymous INSERT policy with a name pattern requiring a 10-digit Indian mobile-number folder and one of `aadhaar`, `pan` or `dl` with an allowed extension. This narrows the former bucket-wide write rule and prevents anonymous overwrite through that removed UPDATE policy, subject to the effective live policy state.

### 3. Admin-only signed document retrieval

The `doc-url` handler requires an `admin_auth_sessions` token matching the supplied admin ID, checks expiry, reloads the admin row and requires `role = super_admin` and `is_active = true`. It allow-lists the three KYC document types, obtains the stored path from the technician row rather than accepting an arbitrary path from the request, rejects legacy full URLs and creates a signed URL with a 300-second expiry.

### 4. Client-side upload constraints and key separation

The browser helper rejects empty files, files over 10 MiB and MIME values outside JPEG, PNG, WebP and PDF. It uses the public anon key rather than a service-role key. Private KYC fields are intended to store object paths; profile photos are stored separately in the public photo bucket.

### 5. Registration-side duplicate-upload guard

The registration page prevents overlapping uploads for the same current document step. This is a UI-level convenience control, not an authorization or server-side rate limit.

## Open risks — carried forward, not counted as new

### F89-CF01 — HIGH: Anonymous KYC upload is not bound to verified registration ownership

**Evidence**
- The latest migration still grants `INSERT TO anon, authenticated` on `technician-docs`.
- Its predicate validates only the bucket ID and syntactic object-name pattern; it does not validate an OTP, verified registration session, signed upload capability or ownership of the mobile-number folder.
- `uploadDocumentWithProgress()` constructs the key as `{mobile}/{docType}.{extension}` from the registration form and sends only the anon key.
- The migration's own comment acknowledges that the no-Supabase-Auth flow cannot prove ownership of the mobile-number folder and calls for an OTP-bound, server-issued upload capability.

**Impact**
An unauthenticated caller can attempt to create an object under another person's valid mobile-number folder. Since KYC upload is now create-only, an attacker who successfully reserves a predictable object key may block the legitimate applicant from uploading the correct document to that key. The private bucket protects reads but does not establish upload ownership or prevent path-squatting.

**Required release action**
Move KYC upload behind an Edge Function or narrowly scoped signed upload capability issued only after verified registration OTP. Bind each capability to the verified mobile, exact document type and exact object key, enforce short expiry and one-time/create-only semantics, and apply abuse limits. Test cross-mobile upload and path-squatting in staging.

### F89-CF02 — HIGH: Public profile-photo bucket still has anonymous bucket-wide write/update policies

**Evidence**
- `20260812120000_secure_technician_docs_storage.sql` creates `technician-photos` as public.
- The same migration grants `anon, authenticated` SELECT, INSERT and UPDATE when `bucket_id = 'technician-photos'`; write predicates do not prove technician ownership.
- The upload helper uses predictable mobile-number-based profile-photo paths and sends the anon key.
- The later 2026-10-31 tightening migration modifies KYC policies only; it does not tighten the profile-photo policies.

**Impact**
Public read access may be intentional for profile display, but it does not justify anonymous write access. A caller may upload arbitrary public objects and attempt to replace known profile-photo keys, enabling impersonation, inappropriate content, storage abuse or denial of service.

**Required release action**
Remove anonymous bucket-wide UPDATE and INSERT. Issue owner-bound upload grants for verified technicians, use non-guessable object keys, validate actual image content and size, and consider quarantine/moderation before making a new photo public.

### F89-CF03 — MEDIUM: File type validation trusts browser-provided MIME and filename extension

**Evidence**
- `validateFile()` checks `file.size` and `file.type` in the browser.
- The object extension is derived from `file.name`; the XHR sets `Content-Type` from `file.type`.
- The Storage bucket metadata contains MIME and size restrictions in its creation migration, and the KYC policy checks the extension, but the inspected upload path does not perform server-side magic-byte/signature validation.
- No malware scanning, quarantine, safe document parsing or image re-encoding step was found in the reviewed upload path.

**Impact**
A direct Storage API caller can bypass browser validation and can supply misleading MIME metadata or an extension that does not describe the actual content. Metadata allowlists and extension regexes are not proof that a file is a valid, safe PDF or image. This increases the risk of malicious or malformed content being stored and later opened by an administrator.

**Required release action**
Validate file signatures and parse the actual format server-side; require extension/MIME/signature agreement; enforce size limits at the trusted upload boundary; quarantine uploads and scan or safely transform them before admin access. Serve untrusted files with safe content-disposition and content-type behavior.

## Additional verification gaps

1. The initial bucket migration uses `ON CONFLICT (id) DO NOTHING`; repository SQL alone does not prove existing production bucket size/MIME metadata was updated.
2. The private KYC migration documents legacy public URLs in technician rows and recommends re-upload or backfill. The source rejects legacy URL values when issuing signed links, but this does not prove old public objects, cached URLs or historical copies were removed.
3. The signed URL expiry is configured as 300 seconds in source; expiry, cache behavior and access after expiry were not tested.
4. The migration source does not prove that the migrations were applied to the active production Supabase project or that no dashboard/manual policies create additional access.
5. The public photo bucket's current live public flag, allowed MIME types, object policies and existing contents were not inspected.

## Required release gates

1. Replace anonymous KYC writes with verified, mobile-bound, short-lived upload capabilities.
2. Remove anonymous profile-photo writes and enforce verified owner-bound upload/replacement.
3. Add server-side file-signature validation, safe parsing/transformation and malware/quarantine controls.
4. Verify the live bucket settings and effective `storage.objects` policies against the migrations.
5. Inventory legacy KYC URL values and objects; verify old public links no longer expose documents.
6. Run controlled staging tests for cross-account upload, key reservation, overwrite, MIME spoofing, malformed files and signed URL expiry.

## Verification limits

This was a repository-source and migration review only. No live Storage API requests, production bucket inspection, policy query, SQL execution, database access, object listing, file upload, malware test, browser network capture, build, automated test, GitHub Actions run, deployment or merge was performed. Findings describe the inspected source, not confirmed live production behavior.

## Release decision

**NOT PRODUCTION READY.** The latest KYC policy tightening improves privacy and prevents anonymous overwrite, but it does not establish ownership of anonymous uploads. Public profile-photo writes remain broad, and file-content safety is not established by client MIME/extension checks. Complete the release gates above and verify the effective production configuration before approval.
