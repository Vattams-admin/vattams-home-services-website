# Security Audit 72 — Payment Security, UPI Verification, Webhook Authenticity, Reconciliation and Refund Authorization

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only payment source review  
**Release status:** **NOT PRODUCTION READY**

## Scope

Reviewed `supabase/functions/payment-auth/index.ts`, `src/lib/payments.ts`, `src/components/PaymentModal.tsx`, payment approval controls in `src/pages/AdminDashboard.tsx`, and the admin-data wallet recharge and financial action handlers. Searched for payment-provider webhook handlers, signature validation, refund endpoints and gateway integrations.

## Executive summary

**New findings: 1 Medium.** The reviewed implementation is a manual UPI/UTR workflow, not an integrated payment-gateway flow. The browser displays a static UPI QR/link, the payer submits a UTR, and an active `super_admin` manually changes the payment from pending to success/failed. The backend explicitly notes that a UTR is not independent bank-settlement evidence and expects the administrator to reconcile it before approval. No gateway webhook receiver, provider signature verification or provider event replay/idempotency handling was identified in the reviewed payment source.

The main payment verification endpoint has useful controls: it checks an unexpired admin session, verifies the current active `super_admin` role, and only approves pending rows with a non-null UTR. It conditionally updates rows from pending, preventing repeated state changes through that query.

## Finding F72-01 — Public payment-record creation permits unauthenticated pending-row creation for arbitrary technician mobile numbers

**Severity: Medium**

The `payment-auth` `create` action does not require a customer or technician session. It accepts caller-supplied `payee_id` and `reference_id`, normalizes them to digits, and checks that both are the same ten-digit mobile number. It then creates a pending ₹49 technician registration-fee payment record for that number. The source comment intentionally restricts this endpoint to the technician ₹49 joining flow, which is a useful amount/purpose constraint, but the server does not establish that the caller controls the supplied mobile number or that a corresponding technician registration is pending for that identity.

The client receives the newly created payment record, including its `payment_action_token`, and uses that bearer capability to submit a UTR. The UTR submission endpoint checks the payment ID, token and pending status; it does not independently authenticate the technician/customer session.

**Impact:** An unauthenticated caller can create pending registration-fee payment records against arbitrary valid mobile numbers. This can pollute payment queues, create misleading payment records for people who did not initiate registration, and increase operational reconciliation workload. The fixed ₹49 amount limits direct financial exposure, and the endpoint does not itself mark a payment successful.

**Remediation:**
1. Require a valid, unexpired technician registration challenge/session and derive the mobile number from that server-side identity rather than trusting the request body.
2. Confirm the registration record is eligible for the fee and bind the payment record to its immutable registration/customer identifier.
3. Add per-account, per-mobile and network-level rate limits plus idempotency for repeated create requests.
4. Enforce a uniqueness or deduplication rule for an active pending registration payment for the same registration.
5. Keep the payment action token high-entropy, single-purpose, time-limited and stored/compared safely; never expose it in admin lists or logs.
6. Add tests for unauthenticated create, arbitrary mobile, repeated requests, token replay, wrong payment ID and expired registration.

## Payment and reconciliation controls observed

- Payment creation is restricted server-side to `payee_type=technician`, `purpose=registration_fee` and exactly ₹49; browser-supplied arbitrary booking/wallet/commission records are rejected by this endpoint.
- The payee and reference are required to be the same ten-digit mobile number.
- UTR submission requires payment ID, payment action token and a constrained alphanumeric UTR format (6–32 characters); update is scoped to the matching payment ID/token and pending status.
- Payment approval/rejection requires a valid unexpired admin session belonging to the supplied admin ID and a current active `super_admin` database row.
- Approval only applies to a pending payment with a non-null UTR; the backend comment explicitly states that the UTR is not independent bank settlement evidence and must be reconciled by an administrator.
- The verification update is conditional on `status = pending`, providing a basic single-transition guard against repeated approvals.
- The admin dashboard exposes manual “Mark Paid” and “Mark Failed” actions; the user-facing flow tells the payer that the submitted UTR will be verified by the team.

## Gateway/webhook assessment

The reviewed payment flow uses UPI deep links/QR generation and manual UTR entry. No payment gateway order creation, provider webhook endpoint, provider signature/HMAC verification, webhook event-ID deduplication, or provider-side settlement query was identified in the reviewed payment source. This is not reported as a vulnerability if manual UPI with human bank reconciliation is the intended operating model. It does mean the product must not represent a client-submitted UTR or QR payment initiation as automatically verified gateway settlement.

If VATTAMS intends to support automated gateway payments, implement a provider-specific server-side order/intent flow, verify webhook signatures against the raw request body, enforce timestamp/replay protections and event idempotency, query provider settlement state where appropriate, and reconcile the provider amount/currency/order/payee against the internal payment and booking before granting service or wallet credit.

## Refund and wallet boundaries

No payment-provider refund API or authenticated refund workflow was identified in the reviewed payment files. Earlier cancellation/refund and wallet audits already documented missing refund tracking, absent booking/payment linkage and recharge/ledger concerns; these are carried forward and not counted as new here. The reviewed `admin-data` recharge-status action updates a pending `wallet_recharges` row to approved/rejected and records admin ID/time; this audit did not establish that this action itself credits a wallet atomically. Verify the wallet-credit transaction and idempotency in the underlying database routine/trigger before relying on approval as settlement.

## Carry-forward items — not counted as new

- Booking/payment/refund linkage, refund tracking and reconciliation gaps: Audits 34 and 35.
- Recharge approval and settlement verification, wallet ledger immutability and payout reconciliation: Audit 34.
- Customer cancellation/refund/dispute authorization and post-completion financial state: Audit 65.
- Admin privilege separation, step-up authentication and session revocation: Audit 71 and earlier admin audits.

## Verification limits

This is a source-code review of the named branch. It does not inspect live bank statements, UPI provider records, deployed payment rows, database triggers/RPCs not reviewed here, production webhook configuration, payment gateway accounts or actual refund settlement. No payment was initiated, no bank reconciliation was performed, and no refund was issued. No SQL, database changes, migration, build, automated test, deployment, GitHub Actions run or merge was performed.

## Release decision

**NOT PRODUCTION READY.** Bind payment creation to an authenticated registration identity, prevent unauthenticated pending-row abuse, and verify actual bank settlement before marking manual UPI payments successful. Preserve clear separation between payment initiation, UTR submission, bank reconciliation and settlement confirmation.
