# Security Audit 63 — Technician Job Completion Evidence, Photos, Signatures and Proof Integrity

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/technician-data/index.ts` — technician account job projection and job status action.
- `src/lib/technicianData.ts` — technician API request helper.
- `src/pages/TechnicianDashboard.tsx` — technician job status controls.
- `src/lib/supabase.ts` — TechnicianJob interface.
- `supabase/migrations/20260728010808_vattams_home_services_schema.sql` — technician_jobs evidence columns and original policies.
- Repository search for `service_photo_urls` and `customer_signature` references.

## Executive result

**1 new finding: F63-01 (Medium).** The schema contains fields for job photos and customer signature, but the current technician Edge Function exposes only a job status transition action; its account projection omits both evidence fields, and the technician dashboard status flow does not submit or verify evidence. The reviewed source therefore does not demonstrate an authenticated, ownership-bound evidence capture and verification workflow before job completion.

## Finding F63-01 — Job completion is not backed by an evidenced photo/signature submission workflow

**Severity:** Medium  
**Status:** Open  
**Evidence:**
- The original `technician_jobs` table defines `service_photo_urls text[] DEFAULT '{}'` and `customer_signature text`.
- The `TechnicianJob` TypeScript interface includes these two fields, indicating that the data model anticipates them.
- The current `technician-data` account action selects a fixed job projection that does not include `service_photo_urls` or `customer_signature`.
- The current `technician-data` `job_status` action accepts a job ID and status from the caller, validates the status against an allowlist, and calls `transition_technician_job_atomic`. It does not accept photo objects/paths, signature data, evidence metadata or a completion checklist.
- The inspected dashboard `updateJobStatus` handler submits only `job_id` and `status`; the job status controls do not submit photo or signature evidence.
- Repository search for the evidence field names returned only the schema and type declaration, not an upload, validation or evidence-verification implementation.

**Impact:** A completion status can be requested through the current technician API without the reviewed application path demonstrating that proof-of-work photos or customer acknowledgement have been captured and validated. This weakens dispute resolution and makes it difficult to independently establish what work was completed, when, and with whose acknowledgement. The actual RPC may enforce additional conditions, but its SQL definition was not available in this review and must be checked before concluding whether server-side evidence enforcement exists.

**Required remediation:**
1. Define which job categories require before/after photos, serial/model evidence, customer acknowledgement, or an explicit reason when evidence is unavailable.
2. Add an authenticated evidence-submission endpoint that derives technician identity from the active session and verifies current job ownership and assignment.
3. Store evidence in a private bucket with server-validated object ownership, strict MIME/size limits, safe generated object names, and short-lived authorized access.
4. Persist evidence metadata (job ID, technician ID, evidence type, object key, upload time, content hash, and optional capture metadata) in a controlled server-side record.
5. Require the completion RPC to verify required evidence and customer acknowledgement (or an audited exception) before accepting terminal completion.
6. Make evidence records append-only or versioned with an audit trail; prevent a technician from silently replacing or deleting submitted proof after completion.
7. Add tests for cross-technician job IDs, forged object paths, missing evidence, duplicate uploads, evidence replacement, and completion racing with reassignment/cancellation.

## Controls and limitations observed

- Technician session identity is derived server-side from `technician_auth_sessions`, not accepted as a client-supplied technician ID.
- The job-status action uses the session-derived technician ID when calling the atomic transition RPC.
- The current technician job list is filtered by the session-derived technician ID.
- These ownership controls are positive, but they do not by themselves prove evidence authenticity or completeness.
- The evidence field references found in this review do not establish that the fields are currently populated in production or that a separate external process captures proof.
- The SQL definition of `transition_technician_job_atomic` was not verified; any server-side evidence requirements inside that function remain unknown.

## Carry-forward items — not recounted

- **Audit 32:** Stale technician status mutation after reassignment and job/booking status graph consistency.
- **Audit 62:** The atomic assignment/transition RPC definitions and deployed RLS/grants were not verified in that pass.
- **Audit 41:** Storage bucket access and upload ownership concerns for technician documents/photos; those findings concern the previously reviewed KYC and technician-photo storage surfaces and must not be assumed fixed or automatically identical to job-proof storage.

## Remediation and release priorities

1. Implement and verify a complete proof-of-work lifecycle before allowing job completion.
2. Verify the exact deployed SQL definition of `transition_technician_job_atomic` and ensure it rejects completion when required evidence is absent.
3. Review storage bucket configuration and policies for job evidence separately from KYC and profile-photo buckets.
4. Introduce customer acknowledgement that is attributable to the customer (for example, a booking-bound OTP or authenticated customer confirmation), not a technician-supplied arbitrary string.
5. Maintain tamper-evident audit records for evidence submission, viewing, replacement, exception approval and completion.
6. Run end-to-end tests with two technician accounts and a customer account, including reassignment and cancellation race cases.

## Verification limits

This is a source-code and migration-history review of the named branch only. No live storage buckets, database rows, deployed RPC definitions, signed URLs, upload paths, customer signatures, or production completion requests were queried or tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. This report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** The reviewed technician workflow demonstrates session-bound status changes but does not demonstrate a complete, authenticated, tamper-resistant proof-of-work submission and enforcement lifecycle.
