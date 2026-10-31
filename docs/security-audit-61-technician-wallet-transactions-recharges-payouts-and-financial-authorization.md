# Security Audit 61 — Technician Wallet Transactions, Recharge History, Payout Records and Financial Data Authorization

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/technician-data/index.ts` — technician account, wallet history and recharge actions.
- `supabase/functions/admin-data/index.ts` — recharge approval, transaction/recharge administration and admin authentication.
- `supabase/migrations/20260728140357_20260728120000_technician_wallet_system.sql` — wallet tables, initial RLS policies and triggers.
- `supabase/migrations/20261010094000_close_public_table_access.sql` — later removal of public table access.
- `supabase/migrations/20261010110000_win_win_call_rate_model.sql` — current completion-fee ledger trigger logic.
- Technician dashboard wallet and recharge history rendering.

## Executive result

**New findings: 0.** The reviewed later migration closes direct anon/authenticated access to the wallet transaction and recharge tables, and the technician Edge Function scopes wallet/recharge reads and recharge creation to the server-validated technician session. The remaining material weaknesses are carryovers from Audits 34, 38 and 50: recharge approval is not bound to independently verified settlement, ledger immutability/idempotency and reconciliation are incomplete, and broad financial admin views remain.

## Controls observed

### Technician session and ownership scoping

- `technician-data` looks up `technician_auth_sessions` by the supplied session token and rejects missing or expired sessions.
- It derives `technicianId` from that session row rather than accepting a technician ID from the request body.
- The account action filters `wallet_transactions`, `wallet_recharges`, and `technician_notifications` by the derived technician ID.
- The recharge action inserts a pending request using the derived technician ID; the caller cannot select another technician's ID through this action.
- Recharge amount is parsed as a number and constrained to a positive value no greater than 100,000.
- Technician wallet/recharge history is bounded to the most recent 20 transactions and 10 recharge requests in the account response.

### Public database access closure

The original wallet migration created permissive anon/authenticated SELECT, INSERT, UPDATE and DELETE policies on `wallet_transactions` and `wallet_recharges`. However, the later `20261010094000_close_public_table_access.sql` migration explicitly drops those policies and revokes all table privileges from PUBLIC, anon and authenticated for both tables. It also removes the public SELECT policy and revokes public privileges from `wallet_settings`.

Therefore, the original migration's permissive policies are historical source, not the final source state after the later hardening migration. This report does not claim that those old public policies remain effective after the later migration. Actual deployed migration state was not queried.

### Recharge approval transition

- The admin Edge Function first verifies an unexpired admin session and an active `super_admin` account.
- The `recharge_status` action accepts only `approved` or `rejected`.
- The update is conditional on the recharge still being `pending`, preventing a second approval/rejection transition through this action once the row has changed state.
- The wallet trigger is intended to process the pending-to-approved transition and credit the wallet.

## Carry-forward items — unresolved, not counted again

### C61-01 — Recharge approval is not linked to independently verified payment settlement

**Original finding:** Audit 34.  
The technician recharge action accepts a caller-provided `payment_ref` string and creates a pending recharge. The admin approval action transitions a pending recharge to approved; the reviewed action does not independently verify a payment-provider settlement or a matching verified payment record before approval. The reference string is not proof of settlement. Preserve the pending state until a trusted reconciliation process confirms the actual receipt.

### C61-02 — Wallet ledger lacks complete immutable-ledger and idempotency guarantees

**Original finding:** Audit 34.  
The wallet schema contains transaction rows, but the reviewed source does not establish a complete immutable append-only ledger with universal idempotency keys and reconciliation controls for every credit/debit source. The newer completion trigger inserts entries for platform-fee remittance, tax remittance and call-rate fees, but this does not by itself prove all historical and operational wallet movements are uniquely keyed, immutable, or reconciled.

### C61-03 — Broad administrator financial visibility and operation-level separation

**Original findings:** Audits 33, 34 and 38.  
The admin Edge Function provides transaction and recharge list actions using broad field selection. Admin access is restricted to active super_admin sessions, but the reviewed design does not demonstrate separate finance-specific roles, narrowly scoped payout permissions, or comprehensive access auditing for financial records. Keep this as the previously recorded administrator/finance least-privilege issue.

### C61-04 — Payout authorization and reconciliation are not evidenced

**Original finding:** Audit 34.  
The reviewed wallet/recharge workflow is not a complete payout workflow. The inspected source does not establish an end-to-end payout request, independent approval, payment execution, bank settlement confirmation, immutable payout reference, and reconciliation lifecycle. Do not infer that a payout has occurred merely from wallet balances or transaction rows.

### C61-05 — Wallet/recharge responses use wildcard field selection

The technician account action uses `select("*")` for transaction and recharge rows, and the admin list actions also use wildcard selects. Technician rows are filtered to the authenticated technician ID and limited in count, which is a positive ownership control, but explicit response schemas are safer and prevent future columns from silently becoming exposed. This overlaps the data-minimization recommendation in Audit 60 and is not separately counted.

## Remediation priorities

1. Require independent payment settlement evidence before an administrator can approve a recharge; persist provider transaction identifiers and verification timestamps.
2. Use a single atomic, idempotent financial operation for recharge settlement and ledger credit, with duplicate/replay tests.
3. Enforce append-only ledger semantics for all financial transactions; restrict correction to compensating entries with reason, actor and audit trail.
4. Reconcile provider receipts, approved recharge rows, wallet balance changes and ledger totals on a recurring basis.
5. Define payout workflow states and enforce separate request, approval, execution and settlement confirmation controls.
6. Replace wildcard transaction/recharge selects with explicit response schemas.
7. Restrict financial administration to least-privilege roles and audit sensitive reads and all financial state transitions.
8. Verify the later access-closure migrations are applied in production and that no subsequent migration reintroduces direct anon/authenticated access.

## Verification limits

This is a source-code and migration-history review of the named branch only. No live Supabase RLS/grants, deployed migration history, database rows, wallet balances, provider settlements, payout execution, or production API behavior was queried or tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. The report does not establish that deployed infrastructure matches the reviewed migration history.

## Release decision

**NOT PRODUCTION READY.** The public table-access closure is a positive source-level control, but financial settlement verification, ledger idempotency/immutability, payout reconciliation and least-privilege finance operations remain unresolved carryovers.
