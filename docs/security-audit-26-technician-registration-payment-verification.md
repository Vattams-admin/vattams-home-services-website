# Security Audit 26 — Technician registration payment verification and joining-fee consistency

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** technician registration payment gate, payment verification action, activation trigger, and joining-fee policy evidence.

## Findings

### 1. Registration previously accepted a pending UTR

The technician registration Edge Function previously accepted payment records when:
- payee type was technician;
- payee mobile matched the applicant;
- amount was ₹49;
- purpose was `registration_fee`;
- UTR was present; and
- status was either `pending` or `success`.

A pending UTR submission is not settlement confirmation. This allowed the Edge Function to create a technician application before an administrator had verified the payment.

### 2. Payment verification did not require a UTR

The payment-auth `verify` action required an active super-admin session and updated a pending payment to success/failed. Before this patch, the success update did not itself require a non-null UTR. The new code adds a non-null UTR filter for success verification. The administrator must still independently reconcile the UTR against actual settlement; the presence of a UTR alone is not proof of settlement.

### 3. Activation trigger checked status but not verification metadata

The existing migration's activation trigger checked matching mobile, ₹49 amount, registration purpose, UTR presence and `status='success'`, but did not require `verified_by` or `verified_at`. The new proposed migration requires both verification metadata fields as well as a non-empty UTR and matching applicant/payment details.

### 4. One-time payment use needed a database constraint

The existing `registration_payment_id` index was non-unique. The new migration adds a partial unique index so one payment ID cannot be attached to multiple technician rows. It performs a duplicate preflight and raises an exception if historical duplicates exist; it does not rewrite or silently reconcile historical rows.

## Changes committed on the security branch

1. `technician-auth/index.ts`
   - Loads `verified_by` and `verified_at`.
   - Rejects registration unless status is exactly `success`.
   - Requires non-empty verification identity and a valid verification timestamp.
   - Continues to require exact mobile, amount ₹49, purpose and UTR match.

2. `payment-auth/index.ts`
   - Success verification now only updates a pending payment with a non-null UTR.
   - Admin session and active super-admin checks remain in place.

3. New migration `20261031153000_require_verified_technician_registration_payment.sql`
   - Strengthens the technician activation trigger to require matching applicant, ₹49, registration purpose, non-empty UTR, `status='success'`, `verified_by` and `verified_at`.
   - Adds duplicate preflight and a partial unique index on non-empty `registration_payment_id`.

## ₹49 / ₹50 policy discrepancy — intentionally unresolved

Current source files on the reviewed security branch consistently show ₹49 in:
- technician registration UI and marketing copy;
- payment-auth payment creation;
- technician-auth registration checks;
- the existing registration activation migration.

However, open PR #36 is titled “Standardize technician joining fee at ₹50”. Its audit notes also describe a live fee setting of ₹50 alongside historical ₹49 payment rows, including a ₹49 success row with missing verification metadata. That is a financial reconciliation issue, not a safe code-only choice.

**No amount was changed in this patch.** ₹49 is retained as the current branch contract until the business owner confirms the intended fee and the actual UPI/bank settlement evidence is reconciled. PR #36 remains open against `main` and was not merged or modified.

## Remaining risks and validation

- Payment creation can still create repeated pending registration-payment rows for the same applicant; payment-create idempotency requires a separate change.
- The one-time payment unique index migration will intentionally fail if existing technician rows reuse a registration payment ID. Check/reconcile duplicates before applying it.
- The new migration is proposed only; it has not been applied to Supabase.
- No live payment rows, bank records, technician profiles, wallet balances, or production functions were modified.
- Deno typecheck, migration dry-run against a schema clone, registration retry tests, and payment lifecycle integration tests remain pending.

## Required acceptance tests

1. Pending payment with UTR cannot create an application.
2. Success payment without UTR cannot be verified.
3. Success payment without `verified_by` or `verified_at` cannot create an application or activate a technician.
4. Wrong mobile, wrong amount, wrong purpose, failed payment, and missing payment ID are rejected.
5. A verified payment can be attached to only one technician; duplicate historical IDs cause a safe migration preflight failure.
6. Registration retry after payment verification does not charge the applicant again.
7. Admin verification requires active super-admin session and records verifier/time.
8. Historical ₹49 and ₹50 records are reconciled against bank/UPI evidence before changing the published joining-fee amount.

**Release assessment: NOT PRODUCTION READY.** This patch improves server-side verification gates but does not resolve the fee policy discrepancy, payment creation idempotency, historical payment reconciliation, or the other P0 security blockers.
