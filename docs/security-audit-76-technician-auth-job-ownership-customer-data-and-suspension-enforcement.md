# Security Audit 76 — Technician Authentication, Job Ownership, Customer-Data Exposure and Suspension Enforcement

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 0.** The reviewed technician-data endpoint resolves the technician identity from a server-side session token, checks session expiry, loads the technician record and blocks protected actions unless the account status is `active`. Job status changes are submitted through `transition_technician_job_atomic` with the server-derived technician ID; the handler maps assignment mismatch to a conflict response.

The technician account response returns job records filtered by the authenticated technician ID, but includes customer name, mobile number and address in those job rows. The query does not visibly limit records to currently assigned or active jobs. This matches the historical-job customer PII exposure already tracked in Audit 53 and is not counted again.

## Scope and evidence reviewed

- `supabase/functions/technician-data/index.ts`
- `supabase/functions/technician-auth/index.ts`
- `src/lib/technicianData.ts`
- `supabase/functions/booking-ops/index.ts` (legacy action status and assignment context)
- `supabase/migrations/20261010110000_win_win_call_rate_model.sql` (technician financial lock/unlock context)

## Positive controls observed

### Session identity and expiry

The technician-data `auth()` helper looks up `technician_auth_sessions` by the submitted token, checks `expires_at`, and returns the stored `technician_id`. The client helper appends the session token after spreading caller-supplied fields, preventing caller data from replacing the authoritative action or session token.

### Active-account enforcement at the protected API

After session authentication, technician-data loads the technician record by the server-derived ID. Missing accounts are rejected. If status is not `active`, all actions except the limited `account` response are rejected with HTTP 403. The inactive account response contains a limited technician profile and empty job/financial/notification collections.

### Job mutation is technician-bound

The `job_status` action allow-lists requested statuses and calls `transition_technician_job_atomic` with `p_technician_id` set to the authenticated session identity, not a client-supplied technician ID. A `BOOKING_ASSIGNMENT_MISMATCH` response is mapped to HTTP 409. The function's internal SQL implementation and deployed definition were not independently inspected in this pass, so its locking and full transition invariants are not asserted here.

### Notification updates are recipient-scoped

Read-one and read-all notification updates constrain rows by the authenticated technician ID (and recipient type for shared notifications).

### Legacy booking actions are disabled

The reviewed booking-ops handler returns HTTP 410 for the old `assign_booking`, `generate_otp`, `verify_otp` and `update_status` paths, preventing those legacy branches from acting as current mutation interfaces.

## Customer-data exposure assessment

The technician account action fetches `technician_jobs` using `.eq("technician_id", technicianId)` and returns customer name, mobile number, address and job notes with each job. This binds the rows to the technician identity, but the visible query does not additionally constrain them to active/currently assigned jobs. Historical records can therefore continue to carry customer contact/location data in the technician dashboard response. This is a carry-forward of Audit 53, not a newly counted issue.

## Suspension and session lifecycle assessment

The login handler verifies credentials and creates a seven-day technician session without an explicit status check before issuing it. However, technician-data subsequently rechecks the current technician status on every request and blocks protected actions for non-active accounts. This reduces the immediate ability of a suspended account to use the protected technician-data API, but does not itself delete or revoke the stored session. The seven-day session/non-active login behavior and suspension-time revocation concern are already tracked in Audit 52; no new finding is counted.

The reviewed financial migration toggles `wallet_locked` based on outstanding dues. That financial lock is distinct from the technician account `status` check and should not be treated as a substitute for suspension enforcement.

## Carry-forward items — not counted as new

- Audit 52: seven-day sessions can be minted for non-active technicians; suspension does not consistently revoke existing sessions. Current technician-data status checks provide a runtime block for this endpoint, but do not prove global session revocation across all APIs.
- Audit 53: technician job history exposes customer PII beyond the current operational need; review retention and field minimization for historical jobs.
- Audit 32: stale technician/job access and status-transition consistency concerns; validate all remaining API and database paths against the atomic transition contract.
- Audit 60: technician profile/KYC/bank/UPI sensitive-data exposure and storage handling.

## Verification limits

This is a source-only review of the named branch. It does not prove the deployed Edge Functions, database function definitions, grants, RLS policies or live account status. No live suspended-account test, cross-technician job-ID test, historical-job access test, SQL/database inspection, migrations, builds, automated tests, deployment, GitHub Actions run or merge were performed.

## Release decision

**NOT PRODUCTION READY.** Preserve server-derived technician identity and per-request active-status enforcement. Before release, verify every technician-facing endpoint applies the same suspension and assignment checks, inspect the deployed atomic transition function, and minimize historical customer PII returned to technicians.
