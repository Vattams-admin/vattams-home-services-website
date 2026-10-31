# Security Audit 78 — File Uploads, Storage Bucket Access, KYC Documents, MIME Validation and Signed URLs

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 0.** The current source separates sensitive technician KYC documents from public profile photos. The `technician-docs` bucket is made private, its anonymous SELECT policy is dropped, and the admin document endpoint requires an active super-admin session before issuing a five-minute signed URL. The `admin-data` sanitizer also hides KYC object paths.

The corrective migration nevertheless retains anonymous INSERT and UPDATE policies on the private KYC bucket, scoped only by bucket ID rather than technician ownership or a server-issued upload capability. The browser upload helper validates file size and MIME type client-side, while object paths are predictable from the technician mobile number and document type. These upload ownership and validation concerns overlap the previously recorded Audit 41 storage findings; they are not counted again here.

## Scope and evidence reviewed

- `supabase/migrations/20260804003828_create_technician_docs_storage_bucket.sql`
- `supabase/migrations/20260812120000_secure_technician_docs_storage.sql`
- `src/lib/technicianRegistration.ts`
- `supabase/functions/technician-auth/index.ts`
- `supabase/functions/admin-data/index.ts`

## Positive controls observed

### Private KYC bucket and public-photo separation

The corrective migration sets `technician-docs` to `public = false`, drops the anonymous SELECT policy and documents that no anon/authenticated SELECT policy should exist. A separate public `technician-photos` bucket is created for profile photos only. KYC columns store object paths; profile-photo fields retain public URLs.

### Admin-only document link generation

The `doc-url` handler calls `requireActiveAdmin`, which validates the admin session token, matches the admin ID, checks expiry, and requires an active `super_admin` account. It allow-lists Aadhaar, PAN and driving-licence columns, rejects missing documents and rejects legacy full public URLs. It generates a signed URL with a 300-second expiry.

### KYC paths hidden from broad admin-data payloads

The `admin-data` recursive sanitizer replaces Aadhaar/PAN/DL object paths with boolean presence indicators. This prevents ordinary dashboard data loads from returning the private storage paths.

### Client upload constraints

The upload helper rejects empty files, files larger than 10 MiB and MIME types outside JPEG, PNG, WebP and PDF. It sends the anon key, never a service-role key, and stores private-document object paths rather than public URLs.

## Carry-forward findings — not counted as new

### 1. Anonymous KYC upload ownership and overwrite controls — Audit 41

The corrective migration removes public read access but explicitly retains `TO anon, authenticated` INSERT and UPDATE policies for every object in `technician-docs`, with predicates checking only `bucket_id`. The policy does not bind an upload to a verified technician session, mobile ownership, one-time upload grant or server-created object path. This is broader than the upload helper's comment that KYC objects are create-only: the migration contains an UPDATE policy. Since the client constructs predictable `{mobile}/{docType}.{ext}` paths, ownership and overwrite protection require a server-enforced design. This is carried forward from the earlier anonymous KYC ownership gap, not counted as a new finding.

### 2. Public profile-photo bucket upload policy — Audit 41

The `technician-photos` bucket is public and its migration permits anonymous/authenticated INSERT and UPDATE for any object in that bucket. Public profile photos are an intentional design choice, but write ownership and overwrite controls remain broad and should be restricted.

### 3. MIME/content validation — Audit 41

The frontend checks `file.type` and file size. This is a client-side check and can be bypassed by a direct Storage API request. The bucket metadata declares allowed MIME types and size limits, but this source review does not establish file-signature inspection, malware scanning, image re-encoding or safe PDF processing. Confirm the live Storage enforcement and add server-side content validation where required.

### 4. Legacy public KYC object migration — Audits 30 and 41

The corrective migration notes that rows created before the private-bucket change may contain full public URLs and that affected documents require re-upload or manual object-path backfill. The `doc-url` handler now returns HTTP 410 for a legacy URL, but this does not prove that old public objects or cached copies were deleted or that historical public links no longer resolve.

## Verification limits

This is a source and migration-file review of the named branch. It does not prove the migrations have been applied in production, the live bucket visibility/policies match these files, old objects were removed, or signed URLs are inaccessible after expiry. No direct Storage API upload/overwrite tests, MIME spoofing tests, signed URL expiry tests, live bucket inspection, SQL execution, migrations, builds, automated tests, deployment, GitHub Actions run or merge were performed.

## Release decision

**NOT PRODUCTION READY.** Preserve private KYC read isolation and short-lived admin-only signed links. Before release, replace bucket-wide anonymous write policies with ownership-bound upload authorization, enforce file constraints independently of browser checks, and verify historical public KYC objects and live bucket configuration.
