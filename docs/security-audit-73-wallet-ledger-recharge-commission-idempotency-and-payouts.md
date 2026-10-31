# Security Audit 73 — Wallet Ledger Integrity, Recharge Crediting, Commission Deductions, Payouts and Financial Idempotency

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration review  
**Release status:** **NOT PRODUCTION READY**

## Scope and evidence reviewed

Reviewed:
- `supabase/migrations/20260728140357_20260728120000_technician_wallet_system.sql`
- `supabase/migrations/20260808120000_commission_and_az_services.sql`
- `supabase/migrations/20261010110000_win_win_call_rate_model.sql`
- `supabase/migrations/20261010094000_close_public_table_access.sql`
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/technician-data/index.ts`
- `supabase/functions/booking-ops/index.ts`

## Executive summary

**New findings: 2 Medium.**

The current model tracks technician wallet balance, locked deposit, available balance and outstanding platform/tax/call-rate dues. The latest wallet migration applies recharge money to outstanding dues first and credits only the excess to the wallet. The financial mutations are performed by database triggers in the same database transaction as the source row update, which is a positive atomicity property.

Two integrity weaknesses remain in the reviewed source:
1. The recharge ledger writes the full recharge amount as a `recharge_credit` transaction even when some or all of that amount is consumed to settle dues and never enters wallet balance.
2. Booking-completion financial postings have no visible unique ledger key/idempotency constraint per booking and financial component. The trigger runs on each transition into `completed`; the admin booking-status handler accepts a broad set of status values and does not enforce a transition graph in the handler. A booking moved out of completed and later back to completed can therefore cause another set of dues and ledger entries.

## Finding F73-01 — Recharge ledger classifies the full payment as wallet credit even when funds are applied to dues

**Severity: Medium**

In `20261010110000_win_win_call_rate_model.sql`, `process_recharge_approval()` locks the technician row, reads `commission_due`, and calculates:
- `due_after = GREATEST(c_due - NEW.amount, 0)`
- `wallet_credit = GREATEST(NEW.amount - c_due, 0)`

It then adds only `wallet_credit` to `technicians.wallet_balance`, while inserting one `wallet_transactions` row with type `recharge_credit` and amount `NEW.amount`. The description explains that the payment is applied to dues first and gives the remaining wallet credit, but the structured transaction type/amount still represents the entire recharge as a wallet credit. For example, when ₹500 is recharged against ₹350 due, the balance increases by ₹150 while the ledger row is typed as ₹500 `recharge_credit`.

**Impact:** Wallet transaction reports, exports, technician statements and any downstream totals that sum `recharge_credit` as wallet balance movement can overstate wallet credits and fail to reconcile with the actual `wallet_balance`. The current schema also leaves `balance_after` nullable and the reviewed trigger does not populate it.

**Remediation:**
1. Record the recharge as a payment/settlement event separately from its allocation.
2. Write distinct, linked ledger entries for dues settlement and actual wallet credit; the latter must equal `wallet_credit`, not `NEW.amount`.
3. Store the before/after balance and the amount applied to each due category.
4. Reconcile every recharge against its payment reference, approved recharge row, dues allocation and resulting wallet balance.
5. Add invariant tests for recharge below dues, exactly equal to dues, above dues, zero dues and concurrent recharge approvals.

## Finding F73-02 — Booking-completion financial postings lack durable per-booking idempotency

**Severity: Medium**

The latest `process_booking_completion()` trigger posts platform-fee, GST-remittance and call-rate-fee rows, increments `commission_due`, and sends notifications when a booking changes to `completed` from a non-completed status. The trigger condition prevents a repeat update while the booking remains completed, and the trigger's database work is atomic with the booking update.

However, the reviewed wallet ledger schema has no visible unique constraint on a booking/component posting key. The trigger does not check for an existing ledger event for the booking before increasing `commission_due` and inserting new component rows. The admin-data `booking_status` handler accepts several status values and directly updates a booking for non-cancellation states; the handler itself does not enforce a legal transition graph. Consequently, a booking that is changed from completed to another status and later back to completed can meet the trigger condition again and post the same financial dues a second time. A retry or alternate privileged update path that replays the transition has the same financial risk unless prevented elsewhere.

**Impact:** Duplicate platform/tax/call-rate dues, duplicate ledger rows and repeated notifications can be created for one completed booking. This can overstate technician liabilities and incorrectly keep a technician wallet locked.

**Remediation:**
1. Add a durable idempotency key for each booking financial event and component, enforced by a database unique constraint.
2. Make the completion posting function insert-once and update `commission_due` only for newly inserted ledger events.
3. Enforce the booking lifecycle transition graph inside a trusted database function, not only in UI controls or an Edge Function branch.
4. Prevent reopening a financially settled completed booking unless a compensating reversal event is created.
5. Add tests for repeated completion, completed → non-completed → completed, concurrent completion updates, transaction rollback and explicit reversal/recompletion.

## Controls observed

- The current recharge trigger locks the technician row with `FOR UPDATE` before calculating dues allocation, reducing concurrent recharge balance races for that technician.
- Wallet and booking financial trigger operations execute in the database transaction that fires the trigger; this is stronger than separate client-side writes.
- The current booking trigger only posts on a transition into `completed`, not on every update while the row remains completed.
- `recalc_available_balance()` derives available balance as wallet balance less locked deposit and outstanding dues, floored at zero.
- The latest wallet migration uses a hardened `search_path` for its `SECURITY DEFINER` functions.
- Migration `20261010094000_close_public_table_access.sql` drops the legacy permissive wallet table policies and revokes all privileges on `wallet_recharges`, `wallet_settings` and `wallet_transactions` from PUBLIC, anon and authenticated. This is a positive source-level hardening measure.

## Payout and withdrawal assessment

The reviewed wallet schema and searched Edge Function paths expose balance, dues, recharge and transaction history. No dedicated technician withdrawal/payout initiation, approval, destination verification or settlement workflow was identified in the files reviewed. This is recorded as a scope limitation, not a confirmed vulnerability or proof that no payout path exists elsewhere.

## Carry-forward items — not counted as new

- Historical wallet ledger immutability and payout authorization/reconciliation: Audit 34.
- Recharge approval versus independent payment settlement evidence: Audits 34 and 72.
- Broad booking lifecycle transition authorization and state integrity: Audit 49.
- Admin operation-level separation and step-up authentication: Audit 71.

## Verification limits

This is a source and migration review of the named branch. The presence of a migration does not prove it has been applied to the production database. No live database schema, trigger definitions, grants, balances, ledger rows, bank settlements or production configuration were queried. No SQL was executed. No migrations, database writes, builds, automated tests, deployment, GitHub Actions run or merge were performed.

## Release decision

**NOT PRODUCTION READY.** Correct recharge ledger allocation semantics and enforce durable idempotency for booking financial postings. Verify the deployed database migration state and reconcile live recharge and completion ledgers before release approval.
