# VATTAMS Home Services — A–Z Production Audit

**Audit date:** 2026-10-14  
**Scope:** Customer booking and pricing, technician onboarding, UPI payment/UTR verification, admin review, technician assignment, service completion, wallet/call-rate accounting, data access, notifications, and deployment safety.  
**Decision:** **Not yet production-ready.** This is a release audit and remediation record, not a claim that every live flow has passed end-to-end testing.

## Critical incident: payment submitted but technician profile absent

Production logs show three technician registration requests returning HTTP 400 before the successful-payment row was updated with its UTR. The production database has no matching technician or application record for this attempt. The payment rows remain financially distinct: one legacy ₹49 row is marked `success` but has no `verified_by`/`verified_at`; another ₹49 row is still `pending` with no UTR. Do not merge these rows, mark the payment verified, or create a technician profile from a payment screenshot/UTR alone. Reconcile the actual bank/UPI settlement first.

### Root causes addressed in the PR branch
- The UTR submission UI could look successful even though it only recorded a pending UTR; that is not proof that the funds settled or that registration completed.
- Registration could be attempted before an administrator had verified the payment.
- Reopening the payment modal could create a second payment row for the same unchanged attempt.
- Booking payment creation stripped non-digits from UUID booking references before checking the UUID, making valid UUID references fail lookup.
- The payment destination had drifted from the existing production UPI destination.
- Duplicate UTR submissions needed both application-level checking and a database uniqueness constraint.

### Implemented in this PR branch (not production-deployed)
- UTR UI explicitly says **Verification Pending** and warns that a submitted UTR is not settlement confirmation.
- A payment status endpoint requires the per-payment action token and returns only the minimum status fields.
- Technician registration checks the server payment record and requires matching technician mobile, purpose, amount policy, UTR, `status=success`, and verification metadata before attempting profile creation.
- The payment attempt is retained on the same device so the user can retry after verification without paying again.
- Payment-modal reopening reuses the same payment record when the payment inputs have not changed.
- UTRs are normalized, duplicate submissions are rejected, success verification requires a submitted UTR, and a partial unique index prevents duplicate non-empty UTRs across concurrent requests.
- The payment recipient is aligned to the existing production destination; do not change it without independent business-bank confirmation.
- Booking UUID references are preserved for validation and lookup.

## A–Z findings and release gates

| Area | Audit result | Release gate |
|---|---|---|
| Customer booking | PR #34 contains booking validation, status wording, assignment rollback, customer booking list, AI draft routing, and pricing-editor fixes. It is open and not merged. | Validate on the combined release candidate against real schema and all booking states. |
| Customer prices | Six active legacy service-price rows currently show ₹299 base price, ₹30 platform fee, and zero percentage commission; separate customer-specific price tables exist. | Confirm the public booking form and admin editor use the same customer-price source; verify every displayed total server-side. |
| Technician call rates | Six active appliance price rows show ₹150 for AC service/repair and ₹200 for refrigerator/washing-machine service/repair. Separate technician call-rate configuration exists. | Test each job type end-to-end and ensure only the configured fixed call rate is charged once on completion. |
| Technician registration | The affected attempt has no technician profile or application record. The live registration trigger still uses legacy ₹49 logic and does not require verification metadata. | Apply the reviewed migration and verify registration is blocked until payment is verified; verify retry/idempotency and duplicate-mobile handling. |
| UPI payments | Production fee setting is ₹50 while the two incident rows are historical ₹49. One row has UTR + success status but lacks verification metadata. | Independently reconcile the bank/UPI settlement; never infer settlement from UTR presence or a client-side message. |
| Admin payment verification | The live payment function is still the deployed v3 implementation; new safeguards exist only on the PR branch. | Deploy only after CI and review; confirm only active super-admins can verify, success requires UTR, and the audit trail is recorded. |
| Wallet and completion | Production has historical balances/ledger entries; the fee/call-rate migrations in PRs #35/#36 are not applied. | Preserve ledger history; test booking completion, duplicate completion, recharge, dues lock, and balance recalculation on a non-production copy before applying migrations. |
| Data access | RLS is enabled on sensitive tables; policies deny direct public access to payments, bookings, technician profiles, jobs, reviews, and support messages. Active price/category reads are public by policy. | Keep all writes behind authenticated Edge Functions; rerun security advisors after release and inspect every function's authorization. |
| Documents | Technician documents use private storage paths for identity documents and a separate public profile-photo bucket. | Confirm storage policies, signed URL expiry, file MIME/size validation, and that private document URLs never appear in public responses. |
| Notifications | Notification and push flows have dedicated Edge Functions; PR #34 includes a notification-failure isolation fix. | Test provider failure, retry, duplicate notifications, and customer/technician/admin recipient scoping. |
| Deployment | PR #34 CI passed; PR #35 CI passed; PR #36 CI passed on an earlier commit. The newest payment hardening commits need their own completed CI run. All three PRs remain unmerged; production migrations/functions have not been changed by this PR. | Run CI on the final head, integrated smoke tests, review migrations, and verify deployment hashes before release. |

## Do not release until all are true

1. The final release candidate includes the required customer/booking fixes and payment/wallet fixes together.
2. Latest GitHub Actions typecheck and production build pass on the exact release commit.
3. The combined customer, technician, admin, payment, and wallet smoke tests pass against a safe test environment.
4. The ₹49 legacy incident payment is reconciled against the actual bank/UPI settlement; no synthetic profile or financial ledger adjustment is used.
5. The production migration history and deployed Edge Function hashes match the approved release.
6. Production smoke checks confirm: payment submitted ≠ payment verified; registration success is shown only after the profile is persisted; booking success is shown only after a booking is persisted; failed assignment rolls back; completion charges the call rate once; and direct public writes remain denied.

**No production database rows, payment statuses, technician profiles, wallet balances, or production Edge Functions were changed during this audit.**
