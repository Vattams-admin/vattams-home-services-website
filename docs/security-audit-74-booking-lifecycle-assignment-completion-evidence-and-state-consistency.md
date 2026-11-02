# Security Audit 74 — Booking Lifecycle, Assignment, Job Execution, Completion Evidence and Financial State Consistency

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 0.** This pass confirms important lifecycle protections in technician operations and assignment, but also confirms an unresolved privileged booking-status path that directly updates booking rows without using the technician job transition RPC. This overlaps with previously recorded booking lifecycle and completion-authorization findings and is therefore carried forward, not counted as new.

## Scope and evidence reviewed

- `supabase/functions/booking-ops/index.ts`
- `supabase/functions/technician-data/index.ts`
- `supabase/functions/admin-data/index.ts`
- `supabase/migrations/20261010110000_win_win_call_rate_model.sql`
- Existing migration and source search for assignment, cancellation, OTP and technician job transition functions.

## Positive controls observed

### Technician job transitions use a server-side atomic RPC

The technician-data `job_status` action:
- Authenticates the technician session and derives the technician identity server-side.
- Restricts requested statuses to a defined allow-list.
- Calls `transition_technician_job_atomic` with job ID, authenticated technician ID and requested status.
- Maps invalid transition and booking-assignment mismatch errors to conflict responses.
- Returns the job and booking result from the RPC rather than performing separate client-side writes.

This is a meaningful ownership and concurrency control. The RPC implementation itself was not available in the reviewed source excerpts, so its internal transition graph and row-lock details are not independently attested here.

### Assignment is routed through an atomic database operation

The booking-ops auto-assignment path calls `assign_technician_job_atomic`. The source comments state that the RPC locks booking and technician rows, rechecks workload/eligibility and writes booking plus technician job in one transaction. The admin assignment handler also checks booking state, existing assignment, active technician status, wallet lock, city and service category before calling the same RPC.

### Cancellation has a dedicated atomic operation

The admin-data cancellation path calls `cancel_booking_atomic` and expects both a booking result and cancelled job records. It handles non-cancellable state as a conflict. This is preferable to separate client-side booking and technician-job updates.

### Deprecated OTP endpoints fail closed

The reviewed booking-ops handler returns HTTP 410 for `generate_otp`, `verify_otp` and `update_status`. The current source therefore does not expose those legacy actions as active completion-proof endpoints.

## Carry-forward issue — not counted as a new finding

### Privileged admin booking status writes bypass the technician job transition RPC

In `supabase/functions/admin-data/index.ts`, the `booking_status` action validates the requested status against a broad allow-list. Cancellation uses `cancel_booking_atomic`, but every other allowed status is written directly to `bookings` using an update filtered only by booking ID. This handler does not call `transition_technician_job_atomic`, does not enforce a legal prior-state → next-state transition graph, and does not require customer OTP/consent evidence before setting `job_completed` or `completed`.

The latest `process_booking_completion()` trigger posts platform fee, GST and call-rate dues when the booking status changes into `completed`. Therefore, this direct admin update path can cause the financial completion trigger to run without the technician job transition path. The underlying admin session still requires an active `super_admin`, but role authentication does not replace lifecycle/evidence validation.

**Previously recorded overlap:** Audit 49 (privileged booking lifecycle transition bypass) and Audit 64 (completion without visible customer OTP/consent proof; legacy booking-ops OTP actions return 410). This is deliberately not double-counted in Audit 74.

**Required closure evidence:**
1. Route all state changes, including admin overrides, through one database-owned transition function.
2. Enforce legal transition edges and current assignment/ownership inside that function.
3. Require an auditable completion evidence record (customer OTP/consent or explicitly approved alternative) before completion can post financial dues.
4. Separate privileged override from ordinary status changes; require reason, actor, timestamp and audit event.
5. Make completion financial posting depend on a durable, verified completion event, not a raw mutable status field.
6. Add tests for every allowed/denied edge, technician reassignment, duplicate completion, admin override, missing proof and rollback.

## Financial state consistency observations

The booking completion trigger runs when a booking changes from a non-completed status to completed and posts financial due components for platform fee, GST and call-rate fee. The lack of a universal booking transition gate means the trigger's status predicate is not itself proof that the service was completed with customer authorization. The repeated-completion/idempotency risk was separately documented in Audit 73 and remains open.

## Verification limits

This is a source-only review of the named branch. The internal definitions and deployed state of `transition_technician_job_atomic`, `assign_technician_job_atomic` and `cancel_booking_atomic` were not independently retrieved in this pass. No live database inspection, booking simulation, customer OTP test, SQL execution, migration, build, automated test, deployment, GitHub Actions run or merge was performed. Source presence does not establish that the same functions or migrations are deployed in production.

## Release decision

**NOT PRODUCTION READY.** Centralize every booking state transition, including admin overrides, behind the same server-side lifecycle and completion-evidence rules. Reconcile this with Audit 49, Audit 64 and Audit 73 before release approval.
