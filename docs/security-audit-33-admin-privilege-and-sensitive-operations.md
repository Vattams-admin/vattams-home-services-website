# Security Audit 33 — Admin Privilege, Sensitive Operations and Cross-Role Boundaries

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Reviewed branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Admin authentication/session validation, privileged admin-data actions, booking/technician/wallet/payment operations, sensitive admin payloads, and role separation.  
**Audit type:** Read-only source review. No application code, SQL, secrets, production data, or deployment settings were changed.

## Executive summary

The reviewed admin API has an important authorization boundary: every `admin-data` request validates a server-side session token, binds it to the supplied admin ID, checks expiry, and re-reads `admin_users` to require an active `super_admin`. The login endpoint also checks the stored bcrypt password and refuses inactive/non-super-admin accounts. Direct anon/authenticated access to the admin session table is revoked in the reviewed migration.

This audit found **one high-priority integrity issue** and **four medium-priority security/privacy hardening gaps**:

1. **HIGH — Admin booking status updates bypass the atomic booking/job transition workflow.** The `booking_status` action directly updates the booking status for every non-cancel status, including assigned, accepted, in_progress and completed. It does not synchronize the related `technician_jobs` row or enforce a transition graph. An admin can mark a booking completed while its technician job remains active, or move a booking backward/forward into an inconsistent state. Cancellation alone uses the atomic RPC.
2. **MEDIUM — Admin login has no visible failed-attempt throttling or lockout.** The handler performs synchronous bcrypt comparison and returns a generic invalid-credentials message for unknown email/wrong password, but no per-account/IP/device rate limit is visible in the reviewed function. Upstream Cloudflare controls were not inspected.
3. **MEDIUM — Admin sessions are stored as raw bearer tokens and have no visible server-side logout/revocation action.** Tokens are stored directly in `admin_auth_sessions`, valid for eight hours, and the reviewed login flow creates sessions without rotating/revoking prior sessions. Dashboard logout handling was not confirmed in the inspected excerpt; the admin API itself has no logout action.
4. **MEDIUM — Broad admin dashboard reads use `select("*")` and a blacklist sanitizer.** Bookings, technicians, customers, payments, wallet transactions and related rows are returned with most/all columns. The sanitizer removes only a small set of OTP/capability fields and KYC object paths. This creates schema-drift exposure risk for identity, bank, payout and internal fields in browser payloads, even though the caller is an active super-admin.
5. **MEDIUM — Privileged mutations are all gated by the same super-admin role, with no finer operation-level separation or step-up verification.** The code does not support distinct read-only, finance, operations or content-admin scopes. Sensitive actions such as payment verification, recharge approval, status changes and service/payout configuration share the same session authorization. This is a blast-radius and governance concern, not evidence that a non-admin can currently invoke these operations.

## Detailed findings

### 33.1 HIGH — Non-cancel booking status changes bypass atomic job synchronization

**Evidence**
- `supabase/functions/admin-data/index.ts` action `booking_status` validates the requested value against a list, then for any status other than `cancelled` executes:
  - `bookings.update({ status, updated_at }).eq("id", booking_id)`
- The cancellation branch alone calls `cancel_booking_atomic`.
- The migration `20261031170000_atomic_booking_cancellation_and_job_transitions.sql` provides a separate row-locked `transition_technician_job_atomic` workflow that synchronizes job and booking status. The admin non-cancel branch does not use it.
- The admin dashboard exposes all booking status values, including completed and intermediate technician states.

**Impact**
The booking and technician-job records can diverge. For example, an admin can set a booking to `completed` while the technician job remains `accepted` or `in_progress`. Conversely, setting a booking back to `pending` can leave a live technician job assigned. This can corrupt operational reporting, job ownership expectations, completion accounting and downstream notification behavior.

**Required remediation**
- Replace direct non-cancel status updates with a dedicated atomic admin transition RPC that locks booking and job rows and applies an explicit admin transition policy.
- If admins need override capability, record actor, reason, previous status, requested status and timestamp in an immutable audit log.
- Require explicit expected-current-status/version checks to prevent stale dashboard writes.
- Add tests for booking/job consistency across every admin-allowed transition, including concurrent admin/technician updates.

### 33.2 MEDIUM — Admin login has no visible brute-force throttling

**Evidence**
- `supabase/functions/admin-auth/index.ts` looks up `admin_users` by normalized email and uses `bcrypt.compareSync`.
- Unknown account and incorrect password both return `Invalid credentials`, which is a positive anti-enumeration control.
- No failed-attempt counter, cooldown, lockout, IP/device throttle, or alerting is visible in this handler.

**Impact**
If no upstream rate limiting exists, an attacker can repeatedly attempt passwords against the privileged admin login. Synchronous bcrypt also consumes edge-function CPU per attempt.

**Required remediation**
- Add durable per-account plus IP/device rate limits with progressive delay and alerting.
- Confirm and document Cloudflare/WAF limits at the deployed endpoint.
- Prefer asynchronous password verification where supported and cap request body size.
- Keep generic credential failure responses.

### 33.3 MEDIUM — Raw admin bearer tokens and no visible server-side revocation

**Evidence**
- `admin-auth` creates a UUID session token and stores it directly in `admin_auth_sessions.token`.
- Expiry is eight hours from login.
- The migration revokes anon/authenticated access to the session table and indexes token/admin/expiry fields; this is a positive control.
- `admin-data` validates the token, matching admin ID, expiry and current active super-admin status on each request.
- No logout/revoke action is present in the reviewed `admin-auth` or `admin-data` handlers. Login does not delete or rotate existing sessions.

**Impact**
A copied session token remains usable until expiry or manual session-row removal. A fresh login does not invalidate an earlier token. Raw token storage increases impact if privileged database contents are exposed.

**Required remediation**
- Add authenticated server-side logout and administrative session revocation.
- Store a cryptographic hash of session tokens rather than the bearer token itself.
- Add session listing/revoke-all controls for incident response and credential changes.
- Consider shorter idle expiry and explicit rotation after sensitive actions.

### 33.4 MEDIUM — Admin data responses rely on wildcard selects and incomplete blacklist sanitization

**Evidence**
- `admin-data` uses `select("*")` for bookings, technicians, customers, wallet transactions, recharges, payments, and service prices.
- `analytics_technician_performance` selects all technician columns.
- The shared sanitizer removes `start_otp`, `complete_otp`, `booking_action_token`, `payment_action_token`, and converts Aadhaar/PAN/DL object paths to booleans.
- Other sensitive fields are not generally allowlisted or masked by the sanitizer.

**Impact**
The current caller is an active super-admin, so these responses are not by themselves proof of unauthorized disclosure. However, broad dashboard payloads expose more data to browser memory, extensions, logs, crash telemetry and accidental frontend rendering than each view needs. New database columns will be included automatically unless explicitly excluded.

**Required remediation**
- Replace wildcard selections with action-specific allowlisted DTOs.
- Separate operational customer contact fields from identity/bank/payout fields and fetch the latter only in a dedicated authorized workflow.
- Mask account numbers and UPI identifiers except when a specific finance task requires full details.
- Add response-schema tests that fail when sensitive fields appear unexpectedly.

### 33.5 MEDIUM — No operation-level role separation or step-up checks

**Evidence**
- The shared `admin()` guard requires `role === "super_admin"` and `is_active === true` for every `admin-data` action.
- The reviewed action switch includes operational booking/technician management, payment and wallet review, price/payout configuration, content/CRM and marketplace catalog configuration.
- No per-action permission matrix, second-factor/step-up check, or separate finance approval scope is visible in this edge function.

**Impact**
The current implementation intentionally restricts the entire API to super-admins, which blocks lower-privilege roles. But it also means any super-admin session has broad powers across finance, customer data, operational status and platform configuration. Compromise or misuse of one account has a large blast radius.

**Required remediation**
- Define a server-enforced permission matrix for read-only support, operations, finance, content and platform configuration.
- Require step-up authentication or dual approval for high-impact financial and payout actions.
- Add immutable audit events for sensitive reads and every privileged mutation.
- Ensure UI visibility is not treated as authorization; enforce permissions inside the edge function for every action.

## Positive controls verified in source

- Every `admin-data` action is behind a server-side session check.
- The token must belong to the supplied admin ID and be unexpired.
- The admin row is re-read on each request; inactive accounts and non-super-admin roles are rejected.
- Admin login uses bcrypt password verification and checks role and active status before issuing a session.
- Unknown-email and wrong-password cases use the same generic invalid-credentials message.
- The session table has RLS enabled and anon/authenticated grants revoked in the reviewed migration.
- Booking cancellation uses an atomic RPC rather than a direct booking-only update.
- Technician assignment uses an atomic assignment RPC after server-side eligibility checks.
- The admin API sanitizer strips selected OTP and booking/payment capability tokens and does not return private KYC storage object paths.
- Admin request helper overwrites caller-supplied action/admin identity/session fields with values read from sessionStorage.

## Validation performed and limitations

- Read-only source review of `admin-auth`, `admin-data`, admin login/dashboard consumers, and the admin session migration.
- No application code or SQL was changed.
- No Deno tests, Postgres integration tests, concurrent transition tests, security tests, rate-limit tests, or production API probes were run.
- No live production database, Cloudflare WAF configuration, deployed function version, or session rows were inspected.
- No GitHub Actions workflow was triggered or modified.
- No Cloudflare deployment was performed.
- This report does not prove that the reviewed branch is deployed or that its migrations are applied in production.

## Release status

**NOT PRODUCTION READY — privileged workflow integrity and admin hardening gaps remain.**

Release blockers from this audit:
1. Route admin booking status changes through an atomic booking/job transition mechanism.
2. Add and verify admin login rate limiting.
3. Add server-side session revocation and hash stored session tokens.
4. Replace broad wildcard admin response payloads with explicit DTOs.
5. Introduce server-enforced least-privilege permissions and step-up/dual approval for sensitive financial actions.
6. Add automated tests for admin authorization, status consistency, revocation, and sensitive response schemas.

This audit is report-only. No deployment, database migration, PR merge, or workflow run was performed.
