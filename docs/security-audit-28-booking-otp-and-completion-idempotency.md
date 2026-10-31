# Security Audit 28 — Booking OTP lifecycle and completion-ledger idempotency

**Date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Read-only source audit. No production database, Supabase configuration, Cloudflare deployment, or GitHub Actions workflow was changed.

## Executive result

**Status: BLOCKED — not production-ready.** The current `booking-ops` Edge Function explicitly returns HTTP 410 for `generate_otp` and `verify_otp`. The historical OTP implementation remains below those unconditional returns and is unreachable. The legacy schema still contains plaintext `start_otp` and `complete_otp` columns. The current branch therefore does not establish a functioning, auditable start/completion OTP lifecycle.

## Findings

### 1. OTP endpoints are deliberately disabled, but legacy implementation remains — HIGH

In `supabase/functions/booking-ops/index.ts`, actions `generate_otp` and `verify_otp` immediately return `{ error: "Deprecated action" }` with status 410. Historical code follows each return and cannot execute. This is not evidence of an active OTP security control; it is dead code. The earlier migration `20260801095448_marketplace_upgrade.sql` still defines nullable plaintext `bookings.start_otp`, `bookings.complete_otp`, and `otp_verified_at` fields.

**Impact:** OTP-based customer authorization cannot be confirmed from this handler. Any live start/completion authorization must be traced to another current endpoint/RPC before release. Do not re-enable the dead implementation as-is.

### 2. OTP storage and abuse controls are not proven — HIGH

The schema stores OTP values in plaintext columns. The active handler provides no evidence of hashed OTP storage, expiry, attempt counters, per-booking rate limits, lockout, replay prevention, or atomic consume-on-success. Because the OTP actions are disabled, the old code cannot be treated as a working control.

**Required remediation:** introduce a dedicated server-side OTP lifecycle with cryptographically secure generation, one-way hash storage, short expiry, bounded failed attempts, rate limiting, purpose binding (start vs completion), one-time atomic consumption, and auditable events that never log or return the OTP. Confirm the recipient channel and customer identity binding before implementation.

### 3. Completion ledger has a transition guard, but no database-level per-booking uniqueness evidence — MEDIUM

Both `20261010110000_win_win_call_rate_model.sql` and the later correction `20261010120000_fix_call_rate_double_charge.sql` define `process_booking_completion()` with the guard:

`NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed')`.

The later migration supersedes the earlier function body and sets technician dues to the fixed `call_rate_fee` only, avoiding a second deduction of platform fee and GST. The transition guard prevents ordinary repeated updates that leave a booking already completed from re-running this trigger body.

However, the inspected function inserts wallet ledger rows keyed by `booking_id` without this migration adding a unique per-booking ledger constraint or a dedicated idempotency key. The trigger guard is useful, but does not by itself prove safety against duplicate completion side-effects caused by alternate completion paths, trigger reinstallation, or future code paths. Verify the deployed trigger attachment and existing unique indexes before claiming end-to-end idempotency.

### 4. Booking completion path still requires integration proof — MEDIUM

Audit 27 introduced `transition_technician_job_atomic` for technician job transitions, but this source-only audit did not execute the RPC against PostgreSQL or prove all status mappings and trigger effects under concurrent requests. The completion function is transactionally invoked by its attached trigger only if the booking row transitions to `completed`; the live database trigger attachment and concurrent behavior remain unverified.

## What was checked

- `supabase/functions/booking-ops/index.ts` — active OTP action branches and booking creation/assignment flow.
- `supabase/migrations/20260801095448_marketplace_upgrade.sql` — legacy OTP columns.
- `supabase/migrations/20261010110000_win_win_call_rate_model.sql` — original completion-ledger function.
- `supabase/migrations/20261010120000_fix_call_rate_double_charge.sql` — later replacement function.
- `supabase/functions/technician-data/index.ts` — current technician job transition RPC call.
- Audit 27 migration `20261031170000_atomic_booking_cancellation_and_job_transitions.sql` is the required next point for transition/trigger integration review.

## Validation limits

- GitHub source retrieval and static branch inspection only.
- No Deno typecheck, lint, unit tests, Supabase migration dry-run, PostgreSQL trigger test, concurrency test, or production read was run.
- No migration was applied and no deployment was performed.

## Release gates

1. Trace every current frontend and Edge Function start/completion path; prove OTP is either intentionally removed end-to-end or replaced with a functioning secure lifecycle.
2. Remove legacy plaintext OTP fields only after confirming no live consumer or data-retention dependency; use a reviewed migration.
3. Add database-enforced idempotency for completion ledger effects, with a safe backfill/duplicate check before adding constraints.
4. Test two concurrent completion requests and retry-after-timeout behavior against a disposable database.
5. Verify the deployed trigger attachment and transition RPC behavior before release.

**Audit 28 conclusion:** OTP lifecycle is not verified and the historical OTP path is disabled; completion side-effects have a useful status-transition guard but lack demonstrated end-to-end idempotency. Production readiness remains blocked.
