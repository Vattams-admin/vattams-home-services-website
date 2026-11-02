# Security Audit 50 — Booking Pricing, Payment Integrity and Duplicate Operations

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Scope: Booking price calculation and persisted snapshots, coupon reservation consistency, payment initiation duplicates, booking-to-payment linkage and settlement boundaries.
Method: Read-only inspection of Edge Function source, migrations and prior audit reports. No payment provider, bank, production database or deployed API was accessed.

## Executive result

**NOT PRODUCTION READY.**

The current booking flow calculates price components server-side from active pricing records, validates numeric configuration, rounds amounts to two decimal places, persists a pricing snapshot, and uses a transactional coupon-redemption RPC with a unique booking redemption index. Those are useful controls.

Two remaining source-level risks were identified: booking insertion and coupon redemption are separate transactions joined by compensating deletion, and the technician registration payment creation endpoint can create another pending ₹49 payment record for the same mobile/purpose without an explicit pending-record reuse or deduplication check. The repository also does not establish a customer booking-payment capture/settlement workflow; that previously identified release blocker is carried forward rather than counted again.

## Findings

### F50-01 — MEDIUM: Booking creation and coupon reservation are not one transaction; compensating deletion can leave a discounted booking without a redemption record

**Evidence**
- supabase/functions/booking-ops/index.ts calculates the booking total and discount, inserts the booking row first, then calls redeem_coupon_atomic in a separate database request.
- If coupon reservation fails, the handler attempts a separate DELETE of the newly inserted booking.
- The handler explicitly handles the case where cleanup fails: it returns BOOKING_CLEANUP_REQUIRES_REVIEW and logs that the booking state needs support review.
- The coupon RPC in supabase/migrations/20261006150000_atomic_coupon_redemption.sql correctly makes coupon usage-counter increment and coupon_redemptions insertion atomic. It also has a unique index on coupon_redemptions.booking_id.
- However, that RPC transaction does not include the preceding booking INSERT or the later compensating DELETE.

**Risk**
A transient failure or deletion-policy/database error after coupon reservation fails can leave a booking row carrying a discounted total even though no coupon redemption was reserved. The endpoint does not claim cleanup succeeded in this case, which is good error handling, but the financial state still requires manual reconciliation. The reverse sequence (coupon reserved but client loses response) also requires an idempotent booking-level recovery path so clients do not blindly create a second booking.

**Remediation**
- Move booking insert, coupon usage reservation and redemption record into one database transaction/RPC, so all three commit or roll back together.
- Generate and persist a client request idempotency key for booking creation, scoped to the authenticated customer or guest capability, and enforce a unique constraint.
- Make retry-after-timeout return the original booking result rather than creating another booking.
- Add a reconciliation query/report for bookings with coupon_code/discount_amount but no matching coupon_redemptions row, and for redemption rows whose booking is missing.
- Test failure injection after each database operation and concurrent duplicate submissions.

### F50-02 — MEDIUM: Technician registration payment creation has no visible pending-payment deduplication for the same payee and purpose

**Evidence**
- supabase/functions/payment-auth/index.ts, action create, accepts only technician registration_fee payments for amount ₹49 and requires a ten-digit payee_id matching reference_id.
- It then unconditionally inserts a new payments row with status pending.
- No lookup for an existing pending registration payment for the same mobile/purpose, reuse of an existing payment, request idempotency key, or duplicate-prevention condition is present in this handler.
- supabase/migrations/20261006140000_harden_payment_capabilities.sql adds a unique index for payment_action_token. That prevents token collisions, but it does not prevent multiple pending payment rows for the same payee and registration purpose.
- The current endpoint does not prove verified ownership of the mobile number at payment creation. That ownership gap was already recorded in Audits 29 and 34 and is not counted again here.

**Risk**
Repeated clicks, retries after network timeouts, or automated requests can create multiple pending payment records for one registration attempt. This can confuse which payment UTR is authoritative, complicate admin reconciliation and leave stale pending rows. This finding is about duplicate record creation, not proof that multiple successful charges occurred.

**Remediation**
- Bind payment creation to a verified registration attempt and accept a stable idempotency key.
- Enforce a database uniqueness rule for one active pending registration payment per verified registration attempt (or a carefully defined payee/purpose scope).
- On retry, return the existing pending payment rather than inserting another.
- Add expiry/abandonment handling for stale pending payment records and a controlled replacement flow.
- Add concurrent create/retry tests proving only one active pending payment exists for the same registration attempt.

## Positive controls observed

1. Booking pricing is calculated in the server-side booking-ops handler from active service pricing and call-rate configuration, not trusted from client-submitted amount fields.
2. The handler fails closed on non-finite or invalid price, GST, platform-fee, commission and call-rate configuration.
3. Base price, GST, platform fee, commission and call-rate components are rounded to two decimal places and persisted as booking pricing fields.
4. Coupon code and discount are validated server-side; the final amount is capped at zero and derived from the calculated total.
5. The coupon RPC reserves usage and inserts a redemption row in one transaction, with a unique booking_id index as a concurrency guard.
6. coupon-ops verifies the authenticated customer owns the booking, checks that the booking is in an eligible state, recomputes the discount and compares it with persisted booking pricing before redemption.
7. payment-auth restricts browser-created payment requests to the fixed ₹49 technician registration fee and rejects arbitrary booking/wallet payment purposes.
8. Payment UTR submission uses a per-payment capability token and a conditional update requiring the payment to remain pending.
9. Admin payment verification checks an unexpired session and current active super_admin role, and only updates pending payments.

## Existing financial findings deliberately carried forward, not recounted

- Audits 34 and 35 found that the reviewed repository does not demonstrate a customer booking payment capture/settlement workflow or a verified booking-payment-to-refund chain. The current booking creation path persists price and a pending booking, but this audit did not find a booking payment intent/capture/settlement action in booking-ops. This remains an existing release blocker, not a new finding count.
- Audits 29 and 34 documented registration payment ownership binding, broad payment-row responses and the fact that a submitted UTR is not independent bank settlement evidence.
- Audit 34 documented missing booking-level idempotency for completion fee ledger posting and the absence of demonstrated payout reconciliation.
- Audit 35 documented the missing customer refund/reversal workflow.

## Production verification gaps

- No deployed database constraints, trigger state, migration ledger or RLS/grant state was checked.
- No payment provider, bank or UPI settlement evidence was accessed.
- No live booking/payment endpoint was called.
- No PostgreSQL transaction, concurrent coupon redemption, duplicate payment creation, timeout/retry or failure-injection test was run.
- No build, Deno test, SQL execution, migration application, deployment, GitHub Actions run or merge was performed.

## Required release gates

1. Make booking insert and coupon redemption one atomic database operation.
2. Add booking-create idempotency and duplicate retry recovery.
3. Add registration-payment idempotency and active pending-payment deduplication.
4. Implement and verify a real booking payment capture/settlement workflow before treating booking totals as paid.
5. Keep registration payment ownership, minimal response DTOs, UTR reconciliation and wallet ledger findings from prior audits open until independently resolved.
6. Test transaction rollback, duplicate submissions, concurrent requests and payment-provider reconciliation against a disposable environment.
7. Verify deployed migration and function versions before production release.

**Conclusion:** Pricing calculation and coupon usage reservation have useful server-side controls, but their cross-request workflow is not fully atomic, and registration payment creation lacks visible duplicate protection. The repository still does not establish customer booking payment settlement. The marketplace remains **NOT PRODUCTION READY**.
