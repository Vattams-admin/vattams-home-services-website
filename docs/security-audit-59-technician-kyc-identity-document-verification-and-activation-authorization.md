# Security Audit 59 — Technician KYC Identity, Document Verification and Account Activation Authorization

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed technician registration form and upload helper, technician-auth registration and document URL handlers, technician-docs storage migrations, admin-data technician status action, and admin dashboard KYC review/approval UI.

## Executive result

- **New findings: 1 Medium**
- Existing anonymous KYC upload ownership and broad storage policy issues are carried forward from Audits 30 and 41, not recounted.
- Private KYC bucket controls and signed document access are present in the reviewed migration/source.
- Server-side activation does not enforce the required Aadhaar/PAN evidence shown in the registration UI.

## Finding F59-01 — Medium: Technician activation is not gated by server-side KYC completeness

**Evidence**

1. `src/lib/technicianRegistration.ts` defines Aadhaar and PAN steps as required through client-side validators (Aadhaar around lines 210–215; PAN around 217–222). Driving licence is explicitly optional (around lines 224–229).
2. `supabase/functions/technician-auth/index.ts` registration handler accepts `aadhaar_url`, `pan_url`, and `dl_url`, but the required-field validation near lines 263–269 checks only name, mobile, city and password. The database insert near lines 337–339 stores document paths as nullable values. It does not reject missing Aadhaar/PAN.
3. `supabase/functions/admin-data/index.ts` action `technician_status` (around line 37) accepts `active` and directly updates the technician status. It does not load/check required KYC document paths before activation.
4. `src/pages/AdminDashboard.tsx` renders the KYC document presence indicators (around lines 2032–2070), but the pending-application Approve button (around lines 2099–2107) is not disabled when a required document is missing.

**Impact**

An authorized administrator can activate a pending technician even when the server-side record has no Aadhaar or PAN document path. This defeats the stated mandatory-document workflow if the approval action is used without manually noticing and verifying the missing evidence. The server does not enforce the KYC prerequisite, so UI validation alone cannot guarantee it.

**Required remediation**

- Enforce required Aadhaar and PAN object-path presence in the server-side registration and activation workflow.
- Before transitioning a pending technician to active, load the authoritative document metadata and reject activation when required evidence is absent.
- Keep driving licence optional unless the product policy changes.
- Prefer an explicit KYC verification state and reviewer metadata (reviewed_by, reviewed_at, document type/version) rather than treating upload presence as proof of identity.
- Add tests that attempt activation with missing Aadhaar, missing PAN, both missing, and valid document paths. Test the Edge Function directly, bypassing the UI.
- Ensure any future document replacement invalidates the prior verification decision and requires re-review.

## Existing controls observed

- The `technician-docs` bucket is changed to private in migration `20260812120000_secure_technician_docs_storage.sql`.
- The migration removes the anonymous SELECT policy and intentionally provides no anon/authenticated SELECT policy for this bucket.
- Admin KYC document access is mediated by the service-role-backed `technician-auth` `doc-url` action.
- `handleDocUrl` requires an unexpired admin session and verifies that the admin account is active with role `super_admin`.
- Document type is allowlisted to Aadhaar, PAN and driving licence columns; legacy public URLs are rejected; generated signed URLs expire after 300 seconds.
- The admin dashboard API sanitizes document object paths from broad technician records and exposes only boolean presence flags.

## Carry-forward items — not counted again

### C59-01 — Anonymous KYC upload ownership and broad storage policy

**Original findings:** Audits 30 and 41.  
The current migration still grants anon/authenticated INSERT and UPDATE on objects in the `technician-docs` bucket using only `bucket_id = 'technician-docs'` as the policy condition. The upload helper constructs paths using a client-supplied mobile number and document type. This does not establish server-verified ownership of the uploaded object. The migration's UPDATE policy also conflicts with the helper comment that KYC uploads are create-only. These are carry-forward storage ownership/policy issues and are not included in the new finding count.

### C59-02 — Legacy public KYC object references

**Original finding:** Audit 30.  
The document URL handler rejects legacy HTTP(S) URLs and asks for re-upload into private storage. Historical records may still contain such paths and need an inventory/re-upload process. No live bucket or object inventory was performed in this audit.

### C59-03 — Broad administrator access to sensitive data

**Original findings:** Audits 30 and 38.  
The reviewed admin-data authorization requires an unexpired admin session and active super_admin role, but the technicians action selects full rows before sanitizing KYC object paths. Other sensitive technician fields may still be included in the broad administrator payload. Existing least-privilege/admin data minimization findings remain open and are not recounted here.

## Verification limits

This is a source-code review of the named branch only. No live storage policy, bucket privacy, object ownership, KYC upload, signed URL, admin approval, identity document authenticity, or technician activation test was performed. No database query, SQL, migration, production data change, deployment, GitHub Actions run, build, automated test, or branch merge was performed. The report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** Close F59-01 and the carried-forward KYC storage ownership/privacy findings. Require server-side evidence checks and an auditable verification decision before technician activation.
