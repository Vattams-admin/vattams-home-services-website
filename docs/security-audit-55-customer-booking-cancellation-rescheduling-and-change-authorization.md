# Security Audit 55 — Customer Booking Cancellation, Rescheduling and Change Authorization

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed the customer-data and booking-ops Edge Functions, admin-data booking actions, customer booking/dashboard UI, customer API wrapper, and the historical reschedule migration. This review did not call deployed endpoints, inspect live database state, or execute user workflows.

## Executive result

One new Medium-severity customer booking-management control gap was identified. The current source implements a privileged cancellation path for administrators but does not expose an authenticated customer cancellation or rescheduling workflow. A historical migration describes rescheduling intent and adds a tracking column, but does not implement the workflow.

No new evidence was found that an unauthenticated or unrelated customer can directly modify another customer's booking. Existing guest-capability, refund, admin lifecycle bypass and cancellation/job lock-order findings are carried forward from earlier audits and are not counted again.

## Finding F55-01 — Customer-initiated cancellation and rescheduling workflow is absent

**Severity:** MEDIUM  
**Category:** Authorization design / customer booking lifecycle  
**Status:** Open — remediation and deployed verification required

### Evidence

1. `supabase/functions/customer-data/index.ts` authenticates a customer session by looking up an unexpired `customer_auth_sessions` row. Its action switch supports account, payments, bookings, booking_refs, profile, reviews, completed bookings, notification reads and support. It has no cancellation, rescheduling, or booking-change action.
2. The customer booking read paths filter bookings by the server-resolved `customerId`. The profile action similarly updates only the customer identified by that session. These are positive ownership controls, but do not provide a booking-change workflow.
3. `src/pages/CustomerBookings.tsx` and `src/pages/CustomerDashboard.tsx` display booking state and preferred date/time. The reviewed pages contain no customer cancellation or reschedule action.
4. `src/lib/customerData.ts` forwards customer actions to the customer-data Edge Function with the stored customer session. It does not provide a separate customer booking-change endpoint.
5. `supabase/functions/booking-ops/index.ts` returns HTTP 410 for the legacy `update_status` action. The current create/assignment flow does not add a customer cancellation or reschedule operation.
6. `supabase/migrations/20260728205726_create_reviews_and_reschedule_system.sql` describes a design in which the old booking is cancelled and a new booking references it through `rescheduled_from`. The migration itself only adds that nullable column; it does not create a reschedule RPC, ownership check, state guard, atomic old/new booking transaction, or customer endpoint.
7. `cancel_booking_atomic(uuid)` in `20261031170000_atomic_booking_cancellation_and_job_transitions.sql` synchronizes booking cancellation and active technician-job records. Execution is revoked from PUBLIC, anon and authenticated and granted only to service_role. In the reviewed source, `admin-data` invokes it for the administrator's `booking_status=cancelled` action. No customer-facing server mediation was found.

### Impact

Customers do not have a demonstrated self-service path to cancel or reschedule an eligible booking. They may need to contact support or an administrator, increasing operational friction and creating a risk of inconsistent manual handling. The reschedule tracking column can give the impression that rescheduling is implemented when the reviewed migration only supplies metadata.

This is a missing customer capability and authorization-safe workflow, not a demonstrated cross-customer booking takeover or unauthorized cancellation exploit.

### Required remediation

- Implement a customer-authenticated booking-change endpoint. Resolve customer identity exclusively from a valid server-side session and require the target booking's `customer_id` to match.
- Define explicit allowed lifecycle states and timing rules for customer cancellation and rescheduling; reject terminal, started, or otherwise ineligible jobs.
- For rescheduling, atomically validate the original booking, create the replacement booking, link `rescheduled_from`, and transition/release any existing technician job consistently. Prevent replay and duplicate replacement bookings with an idempotency strategy.
- Keep privileged RPC execution service_role-only; do not grant direct authenticated execution. The Edge Function must perform ownership and state authorization before invoking it.
- Notify customer and assigned technician after a committed change, with durable retry/reconciliation rather than treating best-effort delivery as proof.
- Add tests for wrong-owner IDs, expired sessions, guest bookings, assigned/accepted/on-the-way jobs, started/completed/cancelled jobs, concurrent cancellation/reschedule requests, duplicate retries and partial failures.

## Positive controls observed

- Customer booking reads are scoped to the server-resolved customer ID.
- Customer profile updates are scoped to the authenticated customer.
- Customer sessions are checked for expiry in customer-data.
- The legacy booking status mutation action in booking-ops is disabled with HTTP 410.
- The cancellation RPC is not executable by anon or authenticated roles.
- The atomic cancellation routine checks eligible statuses and synchronizes active technician-job rows and booking assignment in one transaction.

## Carry-forward items — not counted as new findings

- Guest booking capability-token authorization and guest history continuity: Audits 31 and 54.
- Missing refund handling and payment reversal evidence: Audit 35.
- Admin non-cancellation status updates bypassing the lifecycle state machine: Audit 49.
- Cancellation/technician-transition lock-order deadlock risk: Audit 49.
- Do not treat these previously recorded issues as additional Audit 55 findings.

## Verification limits

This is a source-code review of the named branch only. No production Edge Function invocation, live database/RLS/policy inspection, deployed schema check, customer or admin session test, build, automated test, migration, SQL, deployment, GitHub Actions run, or branch merge was performed. The report does not establish whether deployed infrastructure exactly matches the reviewed source.

**Release decision: NOT PRODUCTION READY.** Close F55-01 with an implemented, tested, ownership-bound customer booking-change workflow and verify it against the deployed environment before release.
