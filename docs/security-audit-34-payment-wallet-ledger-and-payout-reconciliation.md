# Security Audit 34 — Payment, Wallet Ledger and Payout Reconciliation

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Payment creation/UTR submission/verification, technician recharge approval, wallet ledger posting, completion fees, deposit accounting, payout/reconciliation controls.  
**Method:** Read-only inspection of repository source and migration history. No production database, bank/payment-provider account, deployed Edge Function, or Cloudflare configuration was accessed.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository contains meaningful safeguards: the legacy public wallet-table policies are dropped and direct anon/authenticated grants revoked in migration `20261010094000_close_public_table_access.sql`; the payment verification handler requires an active super-admin session; recharge approval is constrained to pending requests; and wallet recharge posting locks the technician row while applying funds to outstanding dues first.

However, the inspected source does not establish a complete auditable payment-to-ledger-to-payout chain. In particular, completion fee posting has no demonstrated unique ledger key per booking, a booking can potentially be re-completed after a status reset and charged again, recharge approval relies on an admin status update rather than a verified settlement integration, and the payout/reconciliation workflow is not present in the reviewed APIs.

## Findings

### F34-01 — HIGH: Completion-fee ledger posting is not protected by a booking-level idempotency key

**Evidence**
- `supabase/migrations/20261010120000_fix_call_rate_double_charge.sql` replaces `process_booking_completion()`.
- The trigger posts dues when `NEW.status = 'completed'` and `OLD.status <> 'completed'`.
- It increments `technicians.commission_due` and inserts a `wallet_transactions` row of type `call_rate_fee` with `booking_id = NEW.id`.
- The inspected wallet ledger migration defines a normal UUID primary key, but the reviewed schema does not establish a unique constraint for a booking + fee event (or another idempotency key).

**Risk**
A booking moved from completed to a non-completed status and later back to completed can satisfy the trigger condition again. Without a unique ledger event constraint or an idempotent posting record, the fixed call-rate fee and outstanding due can be posted more than once for the same booking. This is a financial integrity risk.

**Required remediation**
- Add a unique, immutable ledger event key (for example booking ID + event type + posting version) and enforce it in PostgreSQL.
- Make the completion posting function use an insert-on-conflict/idempotent transaction and update due balances only when the unique ledger event is newly inserted.
- Prevent invalid terminal-state regressions in every booking status mutation path.
- Add SQL tests for repeated completion, status regression/re-completion, concurrent completion attempts, and transaction rollback.

### F34-02 — HIGH: Recharge approval is not linked to independently verified settlement evidence

**Evidence**
- `supabase/functions/admin-data/index.ts`, action `recharge_status`, permits a super-admin to change a pending recharge to approved or rejected.
- Approval sets `approved_at` and `approved_by`, then updates the recharge row.
- The trigger `process_recharge_approval()` credits the request by applying the amount to outstanding dues first and any remainder to wallet balance.
- `supabase/functions/technician-data/index.ts`, action `recharge`, accepts a client-provided `payment_ref` and creates a pending request.
- No payment-provider callback, bank statement import, settlement lookup, or verified transaction reference check was found in the reviewed flow.

**Risk**
The system can treat a manually approved recharge as settled even though the code does not prove the money was received. A payment reference supplied by the technician is not independent bank evidence. An incorrect or fraudulent approval can reduce dues and unlock a technician account without verified funds.

**Required remediation**
- Integrate a trusted payment-provider verification/webhook or a documented bank reconciliation process.
- Store provider transaction ID, verified amount, currency, settlement status, signature-verification result and reconciliation timestamp.
- Enforce unique provider transaction IDs and exact amount/recipient matching.
- Separate “UTR/reference submitted” from “settlement verified” and “wallet credited”.
- Require dual approval or step-up authorization for manual reconciliation exceptions.

### F34-03 — MEDIUM: Registration payment creation is not bound to a verified technician identity

**Evidence**
- `supabase/functions/payment-auth/index.ts`, action `create`, restricts the request to technician registration fee ₹49 and requires a ten-digit payee/reference mobile match.
- It does not validate a technician registration session or prove that the caller controls that mobile number.
- It returns the inserted payment row using `select("*")`.
- The same handler's UTR submission path uses a bearer `payment_action_token` and returns the full payment row.

**Risk**
A caller can create pending registration-payment records for a mobile number without demonstrated ownership verification. Broad row responses also risk exposing capability fields to the browser. This is consistent with the earlier Audit 29 finding and remains unresolved in the inspected source.

**Required remediation**
- Bind payment creation to an OTP-verified registration identity or server-issued registration capability.
- Scope the capability to one payment, amount, purpose, and expiry; store only a hash server-side.
- Return a strict DTO that never includes the bearer token or internal payment fields.
- Apply rate limits and duplicate pending-payment controls.

### F34-04 — MEDIUM: Payment verification accepts a submitted UTR as the only application-level approval prerequisite

**Evidence**
- `payment-auth/index.ts`, action `verify`, checks an active super-admin session and updates only a pending payment.
- For `success`, it requires `utr IS NOT NULL`.
- The code comment correctly states that a UTR is not independent bank settlement evidence and the administrator must reconcile it before choosing success.
- No independent settlement verification is performed by the handler.

**Risk**
The technical state transition can record a payment as successful based on a manually submitted UTR without enforcing evidence of bank settlement. The human instruction in a code comment is not an auditable control.

**Required remediation**
- Require a persisted reconciliation record or trusted provider verification result before `success`.
- Record who reconciled, what evidence was checked, and when.
- Prevent reuse of the same UTR across unrelated payment records unless explicitly supported and reconciled.

### F34-05 — MEDIUM: Wallet balance and dues are represented in separate fields without a complete immutable accounting model

**Evidence**
- The wallet model stores `wallet_balance`, `locked_deposit`, `available_balance`, and `commission_due` on the technician row.
- Completion fee posting increases `commission_due` and writes a `call_rate_fee` ledger row; the current fixed-call-rate migration does not debit `wallet_balance` at completion.
- Recharge approval first reduces `commission_due` and credits only the remainder to `wallet_balance`.
- `recalc_available_balance()` derives available funds as `GREATEST(wallet_balance - locked_deposit - commission_due, 0)`.
- Deposit release changes `locked_deposit` and records a `deposit_release` event, but does not transfer funds into a separate payout account or settlement rail.

**Risk**
The fields can be internally consistent under the current intended model, but the reviewed implementation does not provide a complete double-entry ledger or a demonstrated reconciliation report proving that every balance equals the sum of immutable postings. The name “wallet balance” can also be confused with withdrawable cash even though the model separately tracks dues and locked deposits.

**Required remediation**
- Define a formal accounting model and document whether wallet balance is a cash liability, prepaid credit, or internal balance.
- Derive balances from immutable ledger entries or continuously reconcile cached balances against the ledger.
- Add explicit debit/credit direction, currency, event key, source reference, and before/after balance snapshots.
- Add daily exception reports for negative balances, duplicate events, orphaned postings, and mismatch between ledger and cached technician fields.

### F34-06 — MEDIUM: Payout/withdrawal authorization and reconciliation are not demonstrated in the reviewed financial APIs

**Evidence**
- The inspected `technician-data` API exposes account wallet summaries, transactions and recharge requests.
- The inspected `admin-data` API exposes wallet transactions, recharge requests and recharge approval.
- No payout request, bank-account verification, payout approval, provider transfer, payout reversal, or settlement reconciliation flow was found in these reviewed handlers.

**Risk**
The project cannot claim end-to-end payout readiness from the reviewed code. If payouts are performed manually or in another service, that process and its controls are outside this audit's evidence.

**Required remediation**
- Document the actual payout process and owning service.
- Implement verified beneficiary ownership, maker-checker approval, idempotent transfer instructions, provider status callbacks, reversal handling and reconciliation.
- If payouts are intentionally unsupported, label balances as non-withdrawable and remove any implication that a payout facility is live.

### F34-07 — LOW/MEDIUM: Admin financial actions share the same super-admin authorization boundary

**Evidence**
- `admin-data` checks for an active `super_admin` session before all actions.
- The same role can access payment records, approve/reject wallet recharges, and read wallet transactions.
- No separate finance role or step-up authorization is visible in this handler.

**Risk**
This is not evidence of non-admin access, but a compromised or misused super-admin session has broad financial authority. High-impact financial approval is not separated from general administration.

**Required remediation**
- Introduce finance-specific permissions and maker-checker approval for high-value or exception transactions.
- Require step-up authentication for payment approval, recharge approval, adjustments and payout actions.
- Add immutable audit events containing actor, action, target, before/after values, reason and correlation ID.

## Positive controls observed

1. The payment verification path checks an unexpired admin session and re-reads the admin record to require active `super_admin`.
2. Payment verification updates only a pending payment, preventing a straightforward repeat update after the first state transition.
3. Wallet recharge approval updates only a pending recharge.
4. The current recharge trigger locks the technician row while reading and applying outstanding dues, reducing a concurrent balance-update race within that function.
5. Recharge amounts are applied to outstanding dues before any remainder becomes wallet credit.
6. Technician recharge creation derives the technician ID from the authenticated technician session rather than trusting a client-supplied technician ID.
7. The migration `20261010094000_close_public_table_access.sql` drops legacy public wallet-recharge and wallet-transaction policies and revokes anon/authenticated privileges on these tables.
8. Technician wallet and recharge reads are filtered by the authenticated technician ID.
9. The current call-rate migration corrected the earlier double-charge behavior by making only the fixed call-rate fee become technician dues; customer platform fee and GST are not deducted again from the technician wallet.

## Verification not performed

- No production database connection or live schema/policy inspection.
- No migration application, rollback, or dry-run.
- No Edge Function deployment or live API test.
- No bank, UPI, payment gateway, or settlement-provider verification.
- No Deno unit tests, PostgreSQL trigger tests, concurrency tests, or end-to-end financial reconciliation tests.
- No payout provider or bank beneficiary workflow was available in the reviewed scope.
- No Cloudflare deployment or GitHub Actions workflow was run.

## Required release gates

1. Fix F34-01 with database-enforced idempotency and status-transition protections.
2. Implement independently verified settlement evidence for recharge and registration payments.
3. Remove bearer capability tokens from all payment API responses and bind payment initiation to verified ownership.
4. Produce a formal wallet accounting specification and ledger-to-balance reconciliation.
5. Demonstrate payout controls or explicitly confirm that payouts are not supported.
6. Add automated PostgreSQL and Edge Function tests, including concurrency and replay cases.
7. Verify the deployed database policies and deployed function versions before release.

**Conclusion:** Audit 34 is complete as a repository-source review. It does not certify production financial correctness. The marketplace remains **NOT PRODUCTION READY** until the high-risk findings are remediated and independently tested.
