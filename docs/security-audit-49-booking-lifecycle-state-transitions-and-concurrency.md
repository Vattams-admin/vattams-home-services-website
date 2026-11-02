# Security Audit 49 — Booking Lifecycle State Transitions and Concurrency

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Scope: Booking and technician-job state machines, admin status mutation, assignment atomicity, cancellation/transition concurrency, completion side effects and duplicate operations.
Method: Read-only source and migration inspection. No database, deployed function, concurrency harness or production request was exercised.

## Executive result

**NOT PRODUCTION READY.**

The repository has meaningful atomic operations for assignment, technician job transitions and cancellation. These operations lock rows and keep paired booking/job updates within one transaction. However, the admin booking-status action still permits direct, non-atomic changes to the booking status for every allowed state other than cancellation. It does not enforce a transition graph or synchronize the technician-job row. Because the completion trigger reacts to a booking transition to completed, this path can also trigger completion-side financial effects without proving that the technician job reached a valid completion state.

## Findings

### F49-01 — HIGH: Admin booking status updates bypass the lifecycle state machine and can trigger completion effects independently of technician-job completion

**Evidence**
- supabase/functions/admin-data/index.ts, action booking_status, accepts any value in the allowlist: pending, confirmed, assigned, accepted, on_the_way, in_progress, job_started, job_completed, completed, cancelled.
- For cancelled only, the handler invokes cancel_booking_atomic.
- For every other allowed status, it directly executes bookings.update({ status, updated_at }).eq(id, booking_id). There is no check of the current status, no transition graph, no corresponding technician_jobs update and no compare-and-set condition on the prior status.
- supabase/migrations/20261031170000_atomic_booking_cancellation_and_job_transitions.sql defines transition_technician_job_atomic with an explicit technician-job transition graph and updates job and booking together. The admin direct-update path does not use this function.
- supabase/migrations/20261010120000_fix_call_rate_double_charge.sql defines process_booking_completion(), which runs its completion branch when NEW.status = 'completed' and OLD.status was not completed. It increments technician completion counters and, when call_rate_fee is positive, adds commission_due and inserts a call_rate_fee wallet transaction.
- Therefore, an admin status update directly to completed can satisfy the completion trigger condition even though the related technician_jobs row was not transitioned through the technician state machine. Conversely, changing booking status to other allowed values can leave booking and job records inconsistent.

**Risk**
The admin interface can skip lifecycle stages and create contradictory records. In particular, a booking can be marked completed without a validated technician-job completion transition, while the completion trigger records technician fees and completion counters. Since the direct update is not compare-and-set against the current status, concurrent admin updates can also overwrite a newer state.

**Remediation**
- Replace direct non-cancellation booking status writes with an explicit server-side transition RPC that locks both booking and related job rows, validates actor permissions and the current-to-requested transition, and commits both states together.
- Separate exceptional administrative corrections from ordinary workflow transitions; require a reason, elevated approval and immutable audit event for corrections.
- Prevent admin status mutation from invoking completion accounting unless the corresponding job completion has been verified in the same transaction.
- Add a database-level invariant tying completed booking state to the required terminal technician-job state, accounting for legitimate unassigned or cancelled cases.
- Use optimistic concurrency/version checks or row locks for every state-changing path.
- Add tests proving that direct status jumps, repeated requests, stale requests and concurrent admin/technician changes cannot skip steps or duplicate completion effects.

### F49-02 — MEDIUM: Cancellation and technician transition RPCs acquire booking/job locks in opposite order, creating a deadlock window

**Evidence**
- cancel_booking_atomic in supabase/migrations/20261031170000_atomic_booking_cancellation_and_job_transitions.sql locks the booking row first using SELECT ... FOR UPDATE, then updates matching technician_jobs rows.
- transition_technician_job_atomic in the same migration locks the technician_jobs row first using SELECT ... FOR UPDATE, then locks the associated booking row.
- If cancellation and a technician transition run concurrently for the same booking/job, each transaction can hold the first row lock while waiting for the other transaction's lock. PostgreSQL deadlock detection will abort one transaction; the source does not show a shared lock ordering or retry handling for this case.

**Risk**
The transactions remain atomic, so a deadlock should not partially commit the booking/job pair. However, one legitimate cancellation or technician action can fail transiently under concurrency, surface as a generic server error, and require a manual retry. Repeated contention can reduce operational reliability.

**Remediation**
- Adopt one global lock order for all booking/job lifecycle operations, such as booking row first and then technician-job rows in deterministic ID order.
- Ensure all state-changing RPCs follow the same ordering, including assignment, cancellation, technician transitions and any future admin correction.
- Where deterministic ordering cannot fully avoid deadlocks, classify PostgreSQL deadlock/serialization errors and retry a bounded number of times with jitter at the trusted server boundary.
- Add a two-session integration test that races cancellation against accept/start/complete transitions for the same booking and confirms one valid outcome with no partial state.

## Positive controls observed

1. assign_technician_job_atomic locks the booking and technician, validates assignability and technician eligibility/workload, then inserts technician_jobs and updates bookings in one transaction.
2. admin-data manual assignment invokes assign_technician_job_atomic; the current AdminDashboard manual-assignment UI calls that action rather than writing both tables directly.
3. booking-ops auto_assign invokes the atomic assignment RPC.
4. transition_technician_job_atomic locks the job and booking, checks technician ownership and assignment consistency, validates an explicit transition graph, and updates both records transactionally.
5. cancel_booking_atomic locks the booking, limits cancellation to allowed pre-work states, rejects active job rows and clears assignment in the same transaction.
6. Deprecated booking-ops assign_booking, generate_otp, verify_otp and update_status actions return HTTP 410 in the reviewed handler.
7. The completion trigger has a status-transition guard so an ordinary update that leaves an already-completed booking completed does not re-enter its completion branch.

## Existing findings deliberately not duplicated

- Audit 27 documented earlier assignment/cancellation/job synchronization defects and the introduction of atomic RPCs. This audit assesses the current admin status path and lock ordering remaining after those changes.
- Audit 28 documented the disabled booking OTP flow and lack of proven completion-ledger idempotency. Those OTP and ledger uniqueness findings are not recounted here.
- Audit 35 documented missing customer refund/reversal handling; refund readiness is outside this audit's state-machine scope.
- Audit 33 documented admin status changes bypassing job synchronization; F49-01 is the current branch-specific lifecycle consequence and completion-trigger interaction, not a separate count for the historic finding.

## Verification not performed

- No production database state, deployed function version, trigger attachment or deployed RPC privileges were inspected.
- No PostgreSQL integration test, deadlock race, transaction rollback, stale-write, replay or duplicate-completion test was run.
- No Deno typecheck, build, deployment, GitHub Actions run, SQL execution, migration application or merge was performed.
- Source review cannot establish that the latest migration has been applied in production.

## Required release gates

1. Eliminate the direct admin booking-status update path or constrain it to a separately audited correction workflow.
2. Make booking/job lifecycle transitions enforce one canonical transition graph and consistent paired state.
3. Enforce one lock acquisition order across assignment, cancellation and technician transitions.
4. Verify completion-trigger attachment and ensure completion financial effects require valid job completion.
5. Add automated transition-matrix, stale-request, duplicate-request, rollback and concurrency/deadlock tests.
6. Verify deployed schema/function versions and run tests against a disposable database before production rollout.

**Conclusion:** Atomic assignment, cancellation and technician transition RPCs are positive controls, but the admin direct-status path bypasses them and can cause state divergence and premature completion accounting. Opposite lock order also creates a concurrency failure window. The marketplace remains **NOT PRODUCTION READY**.
