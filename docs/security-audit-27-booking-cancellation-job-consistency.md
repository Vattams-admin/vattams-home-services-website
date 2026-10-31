# Security Audit 27 — Booking cancellation and technician-job consistency

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** manual/automatic assignment, admin cancellation, technician job status transitions, and booking synchronization.

## Findings

### 1. Assignment paths already use an atomic database operation

The current branch contains `assign_technician_job_atomic`, introduced by migration `20261025190000_atomic_technician_assignment.sql`. Both the admin manual-assignment action and booking auto-assignment call it. The function locks the booking and technician, rechecks eligibility and workload, inserts the technician-job row, and updates the booking in one database transaction. This is a positive existing control.

### 2. Admin cancellation previously changed only the booking row

The `admin-data` `booking_status` action directly updated `bookings.status`. It did not synchronize active `technician_jobs` rows or clear `assigned_technician_id`. That could leave an active technician job attached to a cancelled booking and keep the technician appearing busy.

### 3. Technician job transitions previously used two separate writes

The technician-data handler updated `technician_jobs` first, then separately updated `bookings`. A failure between those operations could leave mismatched statuses. The branch version inspected did not make the two writes atomic.

## Changes committed on the security branch

1. New migration `20261031170000_atomic_booking_cancellation_and_job_transitions.sql`
   - Adds service-role-only `cancel_booking_atomic(uuid)`.
   - Locks the booking and permits cancellation only before work has started: pending, confirmed, assigned, accepted, or on_the_way.
   - Changes active technician-job rows for that booking to `rejected`, preserving the job records for audit history.
   - Sets booking status to `cancelled` and clears `assigned_technician_id` in the same transaction.
   - Adds service-role-only `transition_technician_job_atomic(uuid, uuid, text)`.
   - Locks the technician-job and booking rows, validates the existing transition graph, and synchronizes both records in one transaction.
   - A technician rejection marks the job rejected and releases the booking back to pending. Completion updates the booking through the existing completion path, so the existing completion trigger can run transactionally.

2. `supabase/functions/admin-data/index.ts`
   - Routes admin cancellation through `cancel_booking_atomic`.
   - Returns conflict when the booking is already completed/cancelled or work has progressed beyond the allowed cancellation window.

3. `supabase/functions/technician-data/index.ts`
   - Routes technician job status changes through `transition_technician_job_atomic`.
   - No longer performs a job update followed by a separate booking update.

## Validation performed

- Inspected the existing atomic assignment migration and confirmed both manual and automatic assignment use the RPC.
- Inspected the original `technician_jobs` schema: `rejected` is an existing allowed job status, so cancellation retains history rather than deleting job records.
- Confirmed booking status constraint includes `cancelled`, `job_started`, `job_completed`, and the other states used by the new transition function.
- Confirmed both new RPCs revoke execution from PUBLIC, anon and authenticated, granting execution only to service_role. Edge Functions perform session authorization before calling them.
- Re-fetched updated source files and confirmed admin cancellation and technician transitions call the new RPCs.

## Remaining tests and caveats

- No Deno typecheck or integration test suite was run in this audit.
- Migration has not been applied to Supabase; test it against a schema clone first.
- The booking-status admin action still permits non-cancellation status changes through its existing direct update path. Those transitions need a separate authorization/state-machine review.
- Other legacy or direct database write paths must be inventoried before asserting that every cancellation route is covered.
- Notification delivery is intentionally outside the booking/job transaction; notification failure must not reverse a valid cancellation or assignment state.

## Required acceptance tests

1. Cancel pending or confirmed booking: booking becomes cancelled; no active technician job remains.
2. Cancel assigned, accepted, or on_the_way booking: job becomes rejected, booking becomes cancelled, assignment is cleared.
3. Attempt cancellation after in_progress, job_started, job_completed, completed, or already cancelled: rejected without modifying either row.
4. Concurrent cancellation and assignment: exactly one operation wins; no orphan job/assignment pair.
5. Technician rejection: job becomes rejected and booking returns to pending with assignment cleared atomically.
6. Technician accept/on_the_way/in_progress/job_started/job_completed/completed: both rows transition together.
7. Simulate an RPC failure: neither booking nor job row is partially updated.
8. Complete a job: existing completion/wallet trigger executes once, and retrying a terminal transition is rejected.
9. Notifications fail: core booking/job state remains correct and is reported for retry/reconciliation.

**Release assessment: NOT PRODUCTION READY.** This patch closes two source-level synchronization gaps, but migration dry-run, end-to-end concurrency tests, broader direct-write inventory, and the earlier KYC/OTP/payment blockers remain open.
