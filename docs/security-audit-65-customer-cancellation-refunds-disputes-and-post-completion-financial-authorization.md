# Security Audit 65 — Customer Cancellation, Refunds, Disputes and Post-Completion Financial Authorization

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/customer-data/index.ts` — customer booking, payment and support actions.
- `supabase/functions/admin-data/index.ts` — administrator booking status and payment-related actions.
- `src/pages/CustomerPayments.tsx` — customer payment history and invoice presentation.
- `src/pages/CustomerSupport.tsx` — customer support submission.
- `supabase/functions/booking-ops/index.ts` — booking creation and deprecated booking operations.
- Relevant repository search results for refund requests, refund status and cancellation RPC references.

## Executive result

**New findings: 0.** This pass confirms that customer self-service cancellation/refund and a structured booking-dispute lifecycle are still not demonstrated in the active customer API. These are already recorded in Audits 35, 36 and 55 and are carried forward rather than duplicated. The current admin cancellation path calls `cancel_booking_atomic`, but refund processing is not part of the visible response contract. The customer payment page is a read-only history/invoice view.

## Controls observed

### Customer identity and payment history

- `customer-data` validates the customer session against `customer_auth_sessions` and derives the customer ID from the session record.
- Customer booking history is filtered by that derived customer ID.
- Payment history is filtered by `payee_type = customer` and the mobile number loaded from the authenticated customer record; the caller-supplied mobile is not used as the ownership key.
- The customer payment UI validates the shape of returned payment records before rendering and produces a locally generated invoice view from the payment record.

### Customer support submission

- The support action derives customer ID, name and mobile from the authenticated customer session and customer record.
- It inserts a support message with status `open`.
- The customer support UI applies subject/message maximum lengths and rejects selected control characters before submission.

### Administrator cancellation path

- `admin-data` requires an active administrator session through its shared admin authentication check.
- The `booking_status` action validates the requested status against an allowlist.
- For cancellation, it calls `cancel_booking_atomic` and handles booking-not-found and not-cancellable errors.
- For other allowed statuses, it updates the booking row directly. The reviewed handler does not connect a completion status change to a refund or settlement operation.

## Carry-forward items — unresolved, not counted again

### C65-01 — Customer self-service cancellation and rescheduling are absent

**Original finding:** Audit 55.  
The current `customer-data` action set includes account, payments, bookings, profile, reviews, completed bookings, notification and support actions, but no cancellation or rescheduling action. The legacy `booking-ops` update-status path is deprecated. Customer cancellation and rescheduling therefore remain an operational support/admin process rather than a demonstrated customer self-service capability.

### C65-02 — Refund lifecycle, accounting and payment linkage are incomplete

**Original finding:** Audit 35.  
The reviewed customer API has a payment-history read action but no refund request/status action. The reviewed admin-data handler has no refund processing action. The cancellation RPC response returns booking and cancelled job records; the visible caller does not invoke a payment-provider refund, persist a refund transaction, or return a verified refund settlement state. A cancelled booking must not be treated as proof that its payment was refunded.

### C65-03 — Booking cancellation and financial settlement are not one verified end-to-end transaction

**Original findings:** Audits 35 and 49.  
The cancellation operation is delegated to an atomic database RPC for booking/job state. The reviewed Edge Function does not demonstrate that the same transaction creates a refund obligation, initiates provider refund, records the provider reference, or reconciles settlement. The RPC definition and production database state were not verified in this pass.

### C65-04 — Customer dispute and support resolution workflow is incomplete

**Original finding:** Audit 36.  
The customer support API accepts a generic support message and sets status to `open`. The reviewed customer API does not provide a structured booking dispute case with booking ownership validation, dispute category, evidence references, response SLA, resolution decision, refund/adjustment authorization or appeal/audit history. Generic support messaging is not equivalent to a controlled dispute-resolution workflow.

### C65-05 — Support input server-side validation

**Original finding:** Audit 31.  
The support form applies browser-side length limits, but the reviewed `customer-data` support action trims subject/message and inserts them without repeating explicit server-side maximum-length and content validation. This remains the earlier support input-validation finding and is not counted again.

### C65-06 — Completion authorization can bypass a customer-confirmation workflow

**Original finding:** Audit 64.  
The admin booking status handler permits direct updates to allowed non-cancellation statuses, including `completed`, without a visible OTP/customer-consent check in that handler. The technician completion path's atomic RPC enforcement was not verified. This remains the booking completion consent issue from Audit 64 and is not recounted here.

## Remediation priorities

1. Add customer cancellation/rescheduling endpoints with session-derived ownership, explicit eligibility rules and atomic state transitions.
2. Define a refund state machine distinct from booking status: requested, approved, submitted, provider-pending, settled, failed and manually reconciled.
3. Bind each refund to the original payment/provider transaction, booking, customer, amount and currency; enforce idempotency and prohibit refund amounts exceeding captured amounts less prior refunds.
4. Require authorized approval and reason codes for manual refunds, adjustments and exceptions; record actor, timestamp, provider reference and immutable audit event.
5. Reconcile cancellation records, payment captures, refund requests, provider responses and settlement reports.
6. Add a structured booking dispute workflow with customer ownership checks, evidence retention, response/resolution states, escalation and appeal records.
7. Repeat support subject/message validation on the server, including maximum lengths and safe handling of control characters.
8. Prevent direct administrator completion status changes from bypassing the booking OTP/customer consent enforcement required by Audit 64.

## Verification limits

This is a source-code and migration-history review of the named branch only. The SQL definition of `cancel_booking_atomic`, deployed payment-provider configuration, production payment/refund records, provider settlement responses, support case data and live administrator actions were not queried or tested. No real refund was initiated. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. This report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** The customer payment history and session-scoped support submission exist, and admin cancellation uses an atomic RPC call. However, customer self-service cancellation, provider-linked refund accounting, structured dispute resolution and verified completion-consent enforcement remain unresolved carryovers.
