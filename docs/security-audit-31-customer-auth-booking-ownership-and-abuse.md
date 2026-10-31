# Security Audit 31 — Customer authentication, booking ownership and API abuse

**Date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Source review of customer-auth, customer-data and booking-ops. No production database access, migrations, deployments or live abuse tests.

## Executive result

**Status: BLOCKED — not production-ready.** Customer session checks and customer_id-scoped booking queries are present in the reviewed endpoints. Booking creation also binds a signed-in customer's booking mobile to the account mobile. Legacy booking OTP actions are disabled with HTTP 410. However, login and OTP issuance have no demonstrated IP/device-wide throttling, password-reset responses disclose account existence, password resets do not revoke active sessions, and customer data APIs still return broad payment/review/notification records. Booking-action tokens also authorize guest auto-assignment and must be treated as bearer capabilities.

## Positive controls confirmed

1. `customer-data` validates the customer session token and expiry before dispatching actions. Its account, bookings, completed-bookings, booking-reference and reviews queries scope rows by the authenticated `customer_id`.
2. `booking-ops` create_booking accepts an optional customer session; when present it verifies expiry, resolves the customer row, and rejects a booking mobile that differs from the account mobile. The persisted customer_id is derived from the session, not from the booking payload.
3. `customer-auth` stores password hashes rather than plaintext passwords, uses a random 256-bit session token (two UUIDs), and gives sessions a seven-day expiry.
4. Customer email OTPs are hashed, expire after ten minutes, have a five-attempt counter incremented through an RPC, and are conditionally consumed by changing verified=false to verified=true.
5. Customer review submission checks the active session, session/customer ID match, booking ownership and completed status. It checks for an existing review and handles a unique-conflict response.
6. `booking-ops` generate_otp, verify_otp, update_status and assign_booking legacy actions return HTTP 410. The deprecated OTP implementation is not active in this endpoint.

## Findings

### 1. Login has no visible throttling or failed-attempt lockout — HIGH

`customer-auth` login looks up the customer by mobile and compares bcrypt password hashes. The inspected handler has no per-account failed-attempt counter, IP/device rate limiter, progressive delay or lockout. The six-character minimum password rule increases the importance of online throttling.

**Impact:** an attacker can repeatedly attempt passwords against a known mobile number. This review did not establish whether Cloudflare or another upstream layer applies effective limits.

**Required remediation:** implement server-enforced throttling keyed by normalized mobile plus network/device signals, progressive delays and alerting; ensure shared infrastructure limits cannot be bypassed by changing client headers. Keep error messages generic.

### 2. Password-reset endpoints reveal account existence — MEDIUM

`forgot-password` returns different messages for an unknown mobile and for a known account without a verified email. `resend-otp` also checks whether an account exists for forgot_password before sending. These differences enable mobile-number account enumeration.

**Required remediation:** return the same generic response for validly formatted reset requests regardless of account existence; do not reveal whether an account has a verified email. Preserve internal delivery/error telemetry without exposing it to callers.

### 3. Password reset does not revoke existing customer sessions — HIGH

`reset-password` consumes the verified reset OTP and updates the password hash, but the inspected update does not delete or revoke `customer_auth_sessions` for that customer. `change-password` also updates the password without revoking other sessions.

**Impact:** a previously issued or stolen session token can remain usable after a password reset/change until its seven-day expiry or separate logout. A password reset should be a security boundary.

**Required remediation:** revoke all sessions for the customer in the same transaction as password reset/change, or rotate a server-side session version and check it on every authenticated request. Issue a fresh session only after successful reset if product UX requires it.

### 4. Customer session tokens are stored as raw bearer values — MEDIUM

`customer_auth_sessions` lookups compare the presented token directly to the stored `token` value. Tokens are high entropy, but the inspected code does not hash them at rest. A database read compromise would expose active bearer sessions.

**Required remediation:** store a cryptographic hash of session tokens and compare hashes; never log or return tokens except at session issuance. Add session revocation and device/session inventory support.

### 5. OTP throttling is only per-mobile/time-window in the inspected application code — MEDIUM

Registration and forgot-password issuance check for an OTP created in the previous 60 seconds for the mobile/purpose. Verification has a five-attempt counter. The reviewed handlers do not show an IP-wide or device-wide issuance limit, broader daily quota, or abuse controls for distributed requests.

**Impact:** attackers can distribute requests across mobile numbers or networks to abuse email delivery and create operational cost. OTP hashes are unsalted SHA-256 values; because the OTP space is only six digits, a database read compromise permits inexpensive offline enumeration.

**Required remediation:** enforce layered limits (mobile, email, IP/network, device and global provider quota), use a keyed HMAC or equivalent server-secret pepper for OTP storage, and keep one-time consume/attempt increments atomic.

### 6. Customer data API uses broad select-star for payments, notifications and reviews — MEDIUM

`customer-data` correctly scopes these queries to the authenticated customer (payments by customer mobile/payee, notifications by customer mobile, reviews by customer_id). However, payments, notifications and reviews use `select("*")`. The recursive sanitizer removes known OTP and action-token fields but is not a positive allowlist and may expose future sensitive columns added to those tables.

**Required remediation:** define explicit response DTOs for each action and select only customer-visible columns. Add schema-change regression tests that fail when a new sensitive column appears in a customer response.

### 7. Guest booking action token is a bearer capability and authorizes auto-assignment — MEDIUM

`booking-ops` allows guest booking creation without a customer session and returns `booking_action_token` with the new booking ID/number. The `auto_assign` action accepts either a matching booking action token or an active super-admin session. This is capability-based authorization rather than an account-bound action.

**Impact:** anyone who obtains the token can invoke auto-assignment for that booking while it remains assignable. The token must not be exposed in URLs, analytics, logs, notifications, or broad dashboard payloads. The reviewed create response is the intended handoff point, but token lifecycle, expiry, rotation and revocation were not established by this source review.

**Required remediation:** separate customer capabilities by purpose; do not let a general booking token authorize operational assignment. Prefer a server-side auto-assignment trigger or admin/authorized workflow. Hash capabilities at rest, scope actions narrowly, rotate/revoke them and test leakage paths.

### 8. Customer review and support text inputs lack visible server-side size limits — LOW/MEDIUM

`customer-auth` accepts `review_text` and inserts it without a visible length cap. `customer-data` support accepts `subject` and `message` without visible length caps. These are authenticated actions, but oversized payloads can increase storage/logging costs and create downstream rendering or notification issues.

**Required remediation:** validate maximum lengths, normalize input, encode on output, and apply request-body limits. Add abuse limits for review and support submissions.

## Changes made

No runtime code or SQL migration was changed. This audit adds a source-backed report only. The identified fixes touch authentication, session revocation, rate limiting and capability design; they need coordinated tests rather than isolated edits to a single handler.

## Validation limits

- Inspected the security-branch versions of `supabase/functions/customer-auth/index.ts`, `supabase/functions/customer-data/index.ts`, and `supabase/functions/booking-ops/index.ts`.
- No Deno typecheck, unit/integration tests, load/rate-limit test, session-revocation test, OTP concurrency test, database schema/grant verification or production inspection.
- No Supabase migration, deployment, Cloudflare change or GitHub Actions run.
- Upstream Cloudflare/WAF rate limiting was not inspected; absence of application-level throttling in the reviewed handlers does not prove no upstream control exists.

## Release gates

1. Add login, OTP issuance and authenticated write rate limits with abuse telemetry.
2. Make password-reset responses non-enumerating.
3. Revoke all customer sessions on password reset and password change.
4. Hash session tokens and OTPs at rest using a server-secret keyed construction.
5. Replace customer-facing `select("*")` queries with explicit DTOs and field allowlists.
6. Restrict booking-action capabilities to the minimum intended action and add lifecycle/expiry/revocation.
7. Add maximum request/text sizes and tests for review/support inputs.
8. Add adversarial tests: brute-force throttling, account enumeration, reset-with-existing-session, cross-customer booking access, token leakage/replay, guest capability misuse and unexpected-column exposure.

**Audit 31 conclusion:** account-scoped customer reads and session checks are good foundations, but customer authentication hardening, session revocation, API allowlisting and booking capability boundaries remain release blockers. Do not treat source review as proof of deployed controls.