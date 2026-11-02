# Security Audit 79 — API Rate Limiting, OTP Abuse, Brute-Force Resistance and Automated Abuse Controls

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 2 (1 High, 1 Medium).** Customer and technician OTP verification now have a meaningful per-code limit: failed attempts are incremented through the database RPC `increment_otp_attempt_count`, and verification stops after five incorrect guesses. OTP records also expire after ten minutes and successful verification is consumed.

However, the reviewed customer, technician and admin password-login endpoints have no visible server-side attempt throttling, account lockout, IP/device rate limit or progressive delay. The only generic `rateLimit` utility found is an in-memory browser-side map in `src/lib/security.ts`; repository search found no call sites, and it cannot protect server endpoints or coordinate across browser instances. OTP sending has a 60-second per-mobile/purpose check, but no visible IP/global/provider quota or atomic reservation around the check-and-insert sequence.

## Scope and evidence reviewed

- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/technician-auth/index.ts`
- `supabase/functions/admin-auth/index.ts`
- `src/pages/AdminLogin.tsx`
- `src/lib/security.ts`
- `supabase/migrations/20260817020000_add_missing_verify_admin_login_rpc.sql`

The review also searched for `rateLimit(`, OTP attempt increments, login attempt counters, throttling and brute-force controls. The tracked migration creating `increment_otp_attempt_count` was not fully re-opened in this pass; its use and return handling are visible in both auth functions, but its deployed definition and grants remain unverified.

## Findings

### F79-01 — No server-side password-login throttling across privileged and user authentication endpoints

**Severity: High**

**Evidence**
- `customer-auth` login looks up the customer and performs bcrypt comparison, then creates a seven-day session. No failed-attempt counter, per-account lockout, IP/device throttle or backoff is visible in the handler.
- `technician-auth` login performs account lookup and bcrypt comparison, then creates a seven-day session. No failed-attempt throttle or lockout is visible.
- `admin-auth` accepts email/password, queries `admin_users`, performs bcrypt comparison and creates an eight-hour session. No failed-attempt throttle or lockout is visible.
- `src/lib/security.ts` contains a process-local `Map`-based `rateLimit` helper, but repository code search found no call sites. Even if called by a browser component, this state would be client-controlled and not authoritative for Edge Function/API requests.
- The admin login page only disables repeat submission while one request is in flight; that is a UI interaction guard, not an abuse control.

**Impact**
An attacker can repeatedly submit password guesses directly to the public authentication endpoints without a durable server-enforced account/IP/device budget. The admin endpoint is particularly sensitive because a successful guess grants privileged access. Credential stuffing and password spraying are not visibly slowed or blocked by these handlers.

**Required control**
Implement shared server-side throttling with durable atomic counters, layered by account identifier and source/network signals; apply progressive delay and bounded lockout to all three login paths. Add monitoring and alerting for distributed guessing, and avoid relying on browser-only counters.

### F79-02 — OTP issuance is limited per mobile/purpose but lacks layered abuse quotas and atomic send reservation

**Severity: Medium**

**Evidence**
- Customer registration, forgot-password and resend paths query `otp_codes` for a row created within the last 60 seconds for the same mobile and purpose, returning HTTP 429 when found.
- Technician registration and resend similarly enforce a 60-second check for the same mobile and purpose.
- The check is a read followed by a separate insert. No atomic rate-limit reservation, IP/network bucket, device bucket, daily recipient cap, global provider budget or abuse-risk control is visible in these paths.
- The five-attempt verification ceiling is separate from issuance controls; it does not limit how many distinct recipient identities can be targeted from one source.

**Impact**
A source can rotate mobile numbers or race concurrent requests to bypass the per-mobile cooldown and generate repeated email sends. This creates email-provider cost, delivery abuse and potential nuisance/denial-of-service against recipients.

**Required control**
Use atomic shared counters and enforce per-recipient, per-source and global/provider quotas, with daily caps, anomaly detection and a controlled retry policy. Return consistent responses that do not expose account existence.

## Positive controls observed

- Customer and technician OTPs are six-digit codes stored as SHA-256 digests, with ten-minute expiry.
- Both customer and technician verification handlers reject a record after five incorrect attempts.
- Both use the `increment_otp_attempt_count` RPC for failed guesses and fail closed if the RPC errors or returns no count.
- Successful OTP verification uses a conditional update requiring `verified = false`, preventing straightforward reuse of the same record.
- Customer password-reset verification is consumed before the password update, and the handler checks the verified OTP's age.
- Admin authentication restricts successful login to active `super_admin` accounts.
- The browser-side login loading flag prevents accidental simultaneous form submissions, although it is not a security rate limit.

## Carry-forward items — not counted again

- Customer authentication brute-force and enumeration concerns were previously recorded in Audit 31.
- Technician authentication abuse and account-enumeration concerns were recorded in Audit 32.
- Admin login throttle absence was recorded in Audit 33 and the privileged-access review in Audit 71.
- OTP throttling, hashing and delivery concerns were recorded in Audit 37.
- The present audit rechecks current endpoint code and confirms that the generic browser helper does not provide server-side protection. F79-01 and F79-02 are consolidated current-scope findings; earlier audit IDs remain historical references rather than additional findings.

## Verification limits

This is a source and tracked-migration review of the named branch. It does not establish live Edge Function deployment versions, database function definitions/grants, Cloudflare/WAF rate-limit rules, provider-side email quotas, actual abuse telemetry or runtime behavior. No load/abuse tests, SQL execution, database changes, migrations, builds, automated tests, deployments, GitHub Actions runs or merges were performed.

## Release decision

**NOT PRODUCTION READY.** The five-attempt OTP verification ceiling is a useful control, but it does not compensate for the absence of visible server-side password-login throttling and layered OTP issuance quotas. Resolve F79-01 and F79-02, then verify the deployed controls and monitor their effectiveness before production approval.
