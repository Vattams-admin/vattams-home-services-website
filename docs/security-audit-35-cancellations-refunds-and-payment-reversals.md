# Security Audit 35 — Booking Cancellations, Refunds and Payment Reversals

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Booking cancellation, refund eligibility and calculation, payment reversal, customer refund status, technician compensation on cancellation, wallet/ledger effects and reconciliation.  
**Method:** Read-only inspection of repository source and migrations. No production database, payment-provider account, bank account, deployed API, or Cloudflare configuration was accessed.

## Executive result

**Release status: NOT PRODUCTION READY.**

The inspected cancellation RPC is a positive operational control: it locks the booking row, allows cancellation only for selected pre-work states, rejects related active technician-job rows, clears technician assignment, and updates the booking in one database transaction.

However, the reviewed implementation does not establish an end-to-end refund or reversal process. The cancellation function does not create a refund request, call a payment provider, reverse a captured payment, post a refund ledger event, or calculate a customer refund. The reviewed `booking-ops` and `admin-data` actions likewise do not expose a refund operation. This means the repository evidence is insufficient to claim cancellation-to-refund readiness.

## Findings

### F35-01 — HIGH: Cancellation does not create or track a customer refund

**Evidence**
- `supabase/migrations/20261031170000_atomic_booking_cancellation_and_job_transitions.sql` defines `cancel_booking_atomic(uuid)`.
- It locks the booking row with `FOR UPDATE`, permits cancellation only when status is pending, confirmed, assigned, accepted or on_the_way, rejects related active technician-job rows, clears `assigned_technician_id`, and changes booking status to cancelled.
- The function returns the updated booking and count of cancelled job records.
- It contains no refund request, refund amount, refund status, payment-provider call, refund ledger posting, or customer notification about refund settlement.
- The inspected `booking-ops` and `admin-data` handlers have no refund action in the reviewed source.

**Risk**
A booking can become cancelled without the software establishing whether the customer paid, whether money is refundable, how much is refundable, who approved it, or whether the money was actually returned. A cancelled status must not be interpreted as a refunded status.

**Required remediation**
- Model cancellation and refund as separate state machines.
- Add refund request records with booking/payment linkage, eligibility reason, amount, currency, status, approval actor, provider reference, timestamps and failure reason.
- Use a trusted provider refund API or a documented, controlled manual refund workflow.
- Keep booking cancellation successful even if an external refund provider is temporarily unavailable, but create a durable pending refund workflow and alert operations.
- Display separate customer-facing states: cancelled, refund pending, refund processing, refunded, refund failed/not eligible.

### F35-02 — HIGH: No payment capture-to-refund linkage is demonstrated for bookings

**Evidence**
- The inspected `payment-auth` function is limited to technician ₹49 registration payments; it does not implement booking payment capture/refund.
- The inspected booking creation path calculates booking price components and persists a booking, but no payment-provider capture or booking-payment settlement linkage was found in the reviewed flow.
- The cancellation RPC operates on booking/job rows only.
- No refund/reversal handler or provider callback was found in the reviewed functions.

**Risk**
The code reviewed does not demonstrate which customer payment transaction funds a booking, whether it was captured/settled, or which original transaction must be reversed. Without an immutable original-payment reference, a refund can be duplicated, misapplied, or sent for a booking that was never paid.

**Required remediation**
- Link each booking payment to its provider payment-intent/transaction ID and immutable amount/currency snapshot.
- Enforce unique provider transaction references.
- Refund only against a verified captured/settled payment and only up to the remaining refundable amount.
- Store provider refund IDs and idempotency keys; reconcile provider callbacks against the original payment and booking.
- Prevent a refund from exceeding the original settled amount less prior successful refunds.

### F35-03 — HIGH: Technician compensation and fee treatment on cancellation are not explicitly settled

**Evidence**
- `cancel_booking_atomic` rejects active job rows and clears the booking assignment.
- It does not create a technician compensation, call-out fee, cancellation fee, fee waiver, or wallet reversal entry.
- The wallet completion trigger in `20261010120000_fix_call_rate_double_charge.sql` accrues the fixed call-rate fee only on transition to completed.
- The inspected cancellation function does not reverse an existing completion fee or record an adjustment.

**Risk**
The system does not demonstrate a consistent financial outcome for cancellations at different stages. A cancellation before work, after technician travel, or after work has started may require different customer/technician treatment. Without a policy and immutable financial event, manual adjustments can become inconsistent or disputed.

**Required remediation**
- Define explicit cancellation stages and a published fee/compensation policy.
- Record the cancellation initiator, timestamp, job stage, evidence, reason and policy version.
- Use a single atomic financial adjustment operation to post any approved customer fee, technician compensation, fee waiver or reversal.
- Never apply a completion-based call-rate fee to an incomplete/cancelled booking unless a separately approved policy expressly requires a distinct fee.
- Add audit trails and maker-checker approval for manual exceptions.

### F35-04 — MEDIUM: No refund-specific authorization, approval separation or replay controls are evidenced

**Evidence**
- The reviewed admin API uses a common active `super_admin` authorization gate.
- No refund-specific admin action, finance role, step-up authentication, maker-checker approval or refund idempotency key was found in the reviewed source.
- The cancellation RPC is service-role-only, with the caller expected to authenticate and authorize before invoking it.

**Risk**
If refunds are later handled manually outside the application, the repository does not provide evidence of an auditable approval boundary. A future refund endpoint without idempotency and role controls could allow duplicate or unauthorized refunds.

**Required remediation**
- Separate refund request, approval and execution permissions.
- Require maker-checker approval above defined thresholds and step-up authentication for refund execution.
- Bind each refund operation to a unique idempotency key and immutable original payment.
- Record actor, reason, before/after state, provider response and correlation ID in append-only audit events.

### F35-05 — MEDIUM: Cancellation notifications and customer-visible refund communication are not established by the cancellation RPC

**Evidence**
- The RPC returns the updated booking and number of job rows rejected.
- The function itself does not create a refund status, customer refund notification, or communication event.
- No evidence in the reviewed cancellation path guarantees that a customer receives a durable cancellation/refund update.

**Risk**
Customers may see a booking marked cancelled without knowing whether a refund is due, pending, completed or rejected. A best-effort push message alone would not provide a durable communication record.

**Required remediation**
- Create durable notification/outbox events in the same transaction as cancellation/refund state changes.
- Deliver push/SMS/email asynchronously with retries and deduplication.
- Keep the canonical refund state queryable in the customer booking view.
- Provide support escalation details for failed or delayed refunds.

### F35-06 — MEDIUM: Refund accounting and reconciliation reports are not demonstrated

**Evidence**
- The reviewed wallet transaction schema records technician wallet movements and optionally references booking/recharge IDs.
- The reviewed cancellation function does not insert a refund or reversal ledger entry.
- No customer refund ledger, payment-to-refund reconciliation report, or daily refund exception report was found in the reviewed source.

**Risk**
Operations cannot rely on booking status or technician wallet rows alone to reconcile customer funds. Refund totals, provider settlement records, partial refunds, failures and reversals need their own traceable records.

**Required remediation**
- Maintain an immutable payment/refund ledger with original transaction ID, refund ID, amount, currency, status and timestamps.
- Reconcile application records against provider settlement/refund reports.
- Flag orphan refunds, duplicate refunds, amount mismatches, pending refunds past SLA, and refunds against non-captured payments.
- Make partial refunds and multiple refund attempts explicit and cumulative.

## Positive controls observed

1. Cancellation is performed through a database RPC rather than separate frontend writes.
2. The cancellation RPC locks the booking row with `FOR UPDATE`.
3. The RPC rejects cancellation when the booking is in `in_progress`, `job_started`, `job_completed`, `completed`, or another state outside its allowlist.
4. Active technician-job rows are changed to rejected within the same transaction.
5. The booking assignment is cleared in the same transaction as cancellation.
6. The RPC is revoked from PUBLIC, anon and authenticated roles and granted to service_role.
7. The inspected admin handler checks an active super-admin session before the booking-status action.
8. The booking-status handler routes cancellation to the atomic RPC instead of a direct booking update.

## Verification not performed

- No production database or deployed function verification.
- No payment provider, bank, UPI or settlement API inspection.
- No refund execution or test transaction.
- No customer/technician end-to-end cancellation tests.
- No Postgres concurrency, rollback, replay or refund idempotency tests.
- No refund policy/legal/tax review.
- No Cloudflare deployment or GitHub Actions workflow was run.

## Required release gates

1. Implement a durable refund workflow separate from booking cancellation.
2. Link booking payments to verified provider settlement records and immutable transaction IDs.
3. Implement refund idempotency, partial-refund limits, provider callbacks and reconciliation.
4. Define customer refund eligibility and technician compensation by cancellation stage.
5. Add finance-specific authorization, maker-checker controls and append-only audit records.
6. Add durable customer notifications and a customer-visible refund status.
7. Add automated database, Edge Function, concurrency, replay and end-to-end tests.
8. Verify deployed database policies and function versions before release.

**Conclusion:** Audit 35 is complete as a repository-source review. The cancellation path has useful transactional controls, but cancellation is not equivalent to refund. The reviewed repository does not establish production-ready refund execution or reconciliation. The marketplace remains **NOT PRODUCTION READY**.
