# Security Audit 62 — Technician Job Assignment, Acceptance, Rejection and Ownership Isolation

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/technician-data/index.ts` — technician session validation, account job list and job status action.
- `src/lib/technicianData.ts` — technician API request construction.
- `src/pages/TechnicianDashboard.tsx` — technician job list and status action wiring.
- `supabase/functions/admin-data/index.ts` — manual admin assignment and booking status actions.
- `supabase/functions/booking-ops/index.ts` — automatic assignment and retained legacy assignment action.
- `supabase/migrations/20260728010808_vattams_home_services_schema.sql` — original technician_jobs schema and historical permissive policies.

## Executive result

**New findings: 0.** Current technician job reads are filtered by a server-derived technician ID. Job status changes pass the job ID, requested status and session-derived technician ID to `transition_technician_job_atomic`. Current admin manual assignment and automatic assignment paths call `assign_technician_job_atomic`. These are positive source-level controls. However, this review could not verify the SQL definitions of those RPCs or the live deployed database state, so the calls alone do not prove the underlying ownership and transition invariants.

## Controls observed

### Technician identity and job reads

- `technician-data` looks up the supplied session token in `technician_auth_sessions`, rejects missing or expired sessions, and derives `technicianId` from the matched session.
- It verifies the current technician record and requires `status === "active"` for protected actions.
- The account action filters `technician_jobs` by the derived `technicianId`; the request cannot choose another technician's ID for this read.
- The account response selects a defined set of job fields rather than returning every column.

### Technician status changes

- The `job_status` action accepts only the enumerated statuses: accepted, rejected, on_the_way, in_progress, job_started, job_completed and completed.
- The Edge Function calls `transition_technician_job_atomic` with the requested job ID, session-derived technician ID and requested status.
- The API maps missing jobs, invalid transitions and booking-assignment mismatches to explicit failure responses.
- The dashboard sends the selected job ID and requested status through `technicianData`; the helper overwrites caller-provided `action` and `session_token` with the intended action and session token.
- The dashboard refreshes server state after a successful status request rather than treating the locally selected status as authoritative.

### Assignment paths

- Admin manual assignment checks booking eligibility, technician status, wallet lock, city, service category and current workload before invoking `assign_technician_job_atomic`.
- The automatic assignment path in `booking-ops` filters candidates and delegates final assignment, workload recheck and job creation to the same atomic RPC.
- The legacy `booking-ops` `assign_booking` branch contains separate booking update and technician-job insert operations and does not check the booking update result. Its own source comment states that no current frontend caller invokes this action. It is therefore recorded as legacy/dead-path risk, not as a demonstrated current exploitable flow.

## Carry-forward items — unresolved, not counted again

### C62-01 — Stale technician action after reassignment

**Original finding:** Audit 32.  
The earlier audit identified a stale-technician action path in which a technician could reject a job after reassignment and affect the new assignment. The current technician Edge Function delegates to `transition_technician_job_atomic` and explicitly maps `BOOKING_ASSIGNMENT_MISMATCH`, which is a positive apparent mitigation. The SQL implementation of that RPC was not located/verified in this source review, so the invariant that both the job's technician ownership and the booking's current assigned technician are checked atomically remains unverified.

### C62-02 — Job/booking status graph consistency

**Original finding:** Audit 32.  
The technician API allowlist and frontend status options are visible, but the authoritative SQL transition graph and booking synchronization rules reside in the referenced RPC. The SQL definition and deployed version were not verified here. Confirm that every allowed job transition has a matching permitted booking transition, terminal states cannot be reopened, and invalid transitions fail without partial updates.

### C62-03 — Assignment workflow atomicity and legacy branch

The current admin manual and automatic assignment actions invoke `assign_technician_job_atomic`. The retained legacy `booking-ops` `assign_booking` action separately updates the booking and inserts a job, and does not check the booking update result before proceeding. Its source comment says there is no current frontend caller. Keep this as a cleanup/defense-in-depth item and verify that no external or stale client can invoke the legacy action before removal or hard disabling.

### C62-04 — Database direct-access policy history

The original schema migration created permissive anon/authenticated SELECT, INSERT, UPDATE and DELETE policies for `technician_jobs`. Later security migrations have closed direct public access on several operational tables, but this audit did not establish the final deployed grants and RLS policy state for `technician_jobs`. Verify the complete migration sequence and production grants/policies. Do not infer the current deployed policy state from the original migration alone.

## Remediation and verification priorities

1. Retrieve and review the exact SQL definitions for `transition_technician_job_atomic` and `assign_technician_job_atomic`; confirm they lock/recheck the booking, job and technician rows as appropriate.
2. In the transition RPC, require both `technician_jobs.technician_id = p_technician_id` and the current booking assignment to match that same technician before any mutation.
3. Enforce an explicit transition matrix in SQL, including terminal-state protections and atomic booking/job synchronization.
4. Ensure assignment RPC rechecks active technician status, wallet lock, service/city eligibility and one-active-job invariant inside the transaction.
5. Remove or hard-disable the legacy non-atomic `assign_booking` action after verifying no supported caller depends on it.
6. Confirm production RLS/grants prevent direct anonymous/authenticated job reads or writes and that all technician access is mediated by the session-validated Edge Function.
7. Add concurrency tests for simultaneous assignment, stale technician rejection after reassignment, duplicate status submissions, and status transitions racing with admin cancellation/reassignment.

## Verification limits

This is a source-code and migration-history review of the named branch only. The SQL definitions for the referenced atomic RPCs and the live deployed database policies were not verified in this pass. No live technician sessions, cross-account job IDs, concurrent assignment races, status transitions, or production API calls were tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. This report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** Session-derived technician ownership and atomic-RPC usage are positive controls, but the underlying RPC invariants, deployed RLS/grants, and historical stale-assignment and status-graph concerns remain unverified or unresolved.
