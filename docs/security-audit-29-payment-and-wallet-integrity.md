# Security Audit 29 — Payment capability, UTR submission, recharge and wallet ledger

**Date:** 2026-10-31  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Scope:** Source and migration review only. No production database reads/writes, migrations, or deployments.

## Executive result

**Status: BLOCKED — not production-ready.** The payment-auth Edge Function restricts creation to ₹49 technician registration and requires a per-payment capability token for UTR submission. However, payment creation is not authenticated or bound to an OTP-verified registration session. An unauthenticated caller can create pending payment records for arbitrary mobile numbers and receives the capability token. The legacy wallet migration originally grants anon/authenticated broad CRUD on wallet tables; later migration 20261010094000_close_public_table_access.sql removes these policies and revokes browser-role privileges. This later migration is a strong source-level mitigation, but effective deployed grants/policies remain unverified.

## Findings

### 1. Payment creation is not bound to verified applicant ownership — HIGH

supabase/functions/payment-auth/index.ts accepts action=create without checking a customer/technician registration session, OTP proof, or admin authorization. It validates technician payee type, registration_fee purpose, exact ₹49 amount, a 10-digit mobile number, and reference_id equal to that number. It then inserts the payment using the service role and returns select(*), including payment_action_token.

**Impact:** any caller able to invoke the public Edge Function can create registration-fee payment records against arbitrary mobile numbers and receive their UTR-submission capability. This permits payment-record spam and allows a caller to submit a UTR against a payment associated with another person's mobile number. Later admin verification and activation checks do not establish ownership at payment creation.

**Required remediation:** issue payment only after registration OTP/session verification; bind the payment record to that registration attempt and mobile; enforce one active pending registration payment per applicant with safe retry semantics; return only the payer's intended capability response.

### 2. UTR submission capability is a bearer secret — MEDIUM

submitUtr requires payment_id, payment_action_token, and a UTR matching a broad 6–32 alphanumeric pattern. The database update is conditional on both identifiers and status=pending. This is a useful capability check and compare-and-set guard.

However, the token is returned to the caller at creation and stored as a UUID. It is not bound to a verified applicant session, has no expiry/revocation lifecycle, and the UTR response returns the entire payment row using select(*).

**Required remediation:** bind capability to the verified registration attempt; store a hash of a high-entropy token if feasible; limit token lifetime and attempts; return a minimal response excluding the token, internal IDs, verification metadata, and unrelated payment fields. Keep the one-time pending-state compare-and-set.

### 3. Admin verification has a meaningful role gate, but UTR is not settlement evidence — MEDIUM

verifyPayment validates an unexpired admin session, resolves the admin record, and requires an active super_admin. Approval is conditional on status=pending and non-null UTR. The source explicitly notes that a UTR alone is not independent bank settlement evidence.

This is a good authorization baseline, but source does not prove bank-side reconciliation, uniqueness of UTRs across payments, or protection against the same UTR being submitted for multiple records. A non-null UTR check does not prevent duplicate UTR reuse.

**Required remediation:** normalize and enforce UTR uniqueness at the appropriate payment-provider/account scope after duplicate-data preflight; provide a reconciliation workflow and audit evidence for admin approval; return minimal fields from verification.

### 4. Payment create and submit responses return full payment rows — MEDIUM

Both create and submit-UTR paths use select(*) and return the complete payment row. The create response intentionally carries the payer's payment_action_token, but also includes database ID and all fields. The submit response repeats the token and includes verified_by/timestamps and other fields.

**Required remediation:** explicit response DTOs. Return the capability only once in the create response to the intended verified payer; never echo it from submit-UTR or admin verification responses.

### 5. Wallet tables were initially open, later closed in migrations — HIGH deployment verification

The original wallet migration 20260728140357_20260728120000_technician_wallet_system.sql creates anon/authenticated SELECT/INSERT/UPDATE/DELETE policies with unconditional predicates for wallet_transactions, wallet_recharges, technician_notifications, and wallet_settings.

Later migration 20261010094000_close_public_table_access.sql drops the public CRUD policies and revokes all table privileges from PUBLIC, anon, and authenticated for wallet_transactions and wallet_recharges, among other sensitive tables. This is the intended hardening state. Source search also found the migration removing wallet-settings public write policies, but the deployed effective policy/grant state must be checked.

**Impact:** if the hardening migration has not been applied to the target database, the original policies expose financial ledger data and allow unauthorized manipulation of recharge records. A source migration being present in Git does not prove it has been applied in production.

**Required remediation:** verify effective pg_policies, table grants, and function execute grants in the actual target environment before release. Keep all wallet mutations behind authenticated server-side handlers and admin authorization.

### 6. Recharge approval trigger is transition-guarded but needs operational verification — MEDIUM

The latest 20261010110000_win_win_call_rate_model.sql function process_recharge_approval() runs only when status transitions to approved, locks the technician row, applies payment first against outstanding dues, credits only the remainder to wallet balance, and writes a ledger row keyed by recharge_id. This is better than the earlier wallet migration, whose trigger credited the full amount directly.

However, source does not demonstrate a unique ledger constraint on recharge_id, a single guarded admin approval RPC, or integration behavior under concurrent approval/retry. technician-data recharge inserts a pending recharge row, but the admin approval endpoint and effective RLS state need a separate end-to-end trace.

**Required remediation:** ensure approval is a conditional pending-to-approved transition through an authorized admin-only path; enforce ledger idempotency for each recharge; test concurrent approval and retry-after-timeout behavior.

## Changes made

No runtime code or SQL migration was changed in this audit. The discovered issues cross registration identity, payment DTO, UTR reconciliation, admin approval, RLS/grants, and wallet-ledger semantics; a speculative partial patch would risk breaking the registration and accounting workflow.

Added this report to the security branch and updated PR #51.

## Validation limits

- Retrieved current branch source and migration text from GitHub.
- No Deno typecheck, build, unit tests, PostgreSQL dry-run, RLS simulation, concurrency tests, live payment reconciliation, or production DB verification.
- No migration was applied and no deployment was performed.

## Release gates

1. Bind payment creation to OTP-verified registration ownership.
2. Replace broad payment row responses with explicit DTOs; do not echo capability after initial issuance.
3. Add UTR duplicate/reconciliation controls with historical duplicate preflight.
4. Verify production RLS policies and table grants for wallet/payment tables.
5. Trace and harden admin recharge approval; add per-recharge ledger idempotency.
6. Test registration payment, UTR submission, admin approval, wallet credit, concurrent retries, and unauthorized callers end-to-end.

**Audit 29 conclusion:** payment capability matching and admin role verification are useful controls, but applicant ownership, UTR uniqueness/reconciliation, minimal responses, and effective wallet permissions/ledger idempotency remain release blockers.