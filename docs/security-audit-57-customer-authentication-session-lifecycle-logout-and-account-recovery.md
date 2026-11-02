# Security Audit 57 — Customer Authentication, Session Lifecycle, Logout and Account Recovery

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope and executive result

Reviewed `customer-auth`, customer login/forgot-password/profile UI, and the customer session table migration. One new Medium-severity logout revocation reliability finding was identified. Password-change/reset session invalidation and account enumeration remain carryovers from Audit 31 and are not counted again.

## Finding F57-01 — Logout reports success without confirming server-side session revocation

**Severity:** MEDIUM  
**Category:** Authentication / session revocation reliability  
**Status:** Open — fail-closed response handling and verification required

### Evidence

1. In `supabase/functions/customer-auth/index.ts`, the `logout` action reads `session_token`, issues a delete against `customer_auth_sessions` filtered by token, does not inspect the returned database error or affected-row result, and unconditionally returns a successful logout response.
2. In `src/pages/CustomerProfile.tsx`, `handleLogout` removes the customer profile, token and local expiry from sessionStorage and navigates away before making the server logout request.
3. The frontend treats the server request as best-effort. Network errors are swallowed, and there is no retry queue or explicit warning that server-side revocation could not be confirmed.
4. Customer API authorization uses the server-side `customer_auth_sessions` table. Therefore, clearing browser storage alone does not invalidate a still-existing server-side token.

### Impact

If the database delete fails or the logout request never reaches the Edge Function, the browser appears logged out while the server-side session may remain valid until expiry or another successful revocation. A copied or otherwise exposed token could continue to authorize customer API calls from another client. This is a session-revocation assurance gap; it does not mean every logout fails.

### Required remediation

- Inspect the database delete error and return a failure response unless revocation is confirmed.
- Make the logout operation idempotent while distinguishing successful deletion from backend failure.
- Have the frontend surface an unconfirmed server logout and provide a retry path; do not represent local token removal as proof of server revocation.
- Consider a server-side logout-all/session-revocation control for account recovery and suspected compromise.
- Add tests for successful deletion, already-absent token, database failure, network timeout, malformed token, and replay of a token after logout.
- Verify that every customer-protected Edge Function rejects a revoked token.

## Authentication/session controls observed

- Customer login validates mobile format and compares the supplied password against the stored bcrypt hash.
- Login creates a random session token with a seven-day expiry.
- Login attempts to delete existing sessions for that customer before inserting the new session, apparently implementing a one-active-session policy. The delete result is not checked; verify the intended policy and error handling.
- Customer session records have a unique token, customer foreign key, expiry and supporting indexes. RLS is enabled and anon/authenticated table privileges are revoked in the reviewed migration.
- Customer-data and change-password actions check session expiry server-side.
- Change-password requires the current password and a valid session.
- Password reset requires a verified forgot-password OTP and consumes the verified OTP row before updating the password.
- OTP verification checks expiry and caps incorrect attempts at five; resend/request throttling visible in the reviewed flow is limited to a 60-second per-mobile/purpose window.

## Carry-forward items — not counted as new findings

- Password reset/change does not revoke existing customer sessions: previously recorded in Audit 31. The current source still updates the password without deleting `customer_auth_sessions`; this audit confirms it remains unresolved but does not count it again.
- Password-reset account enumeration through distinct “account not found” / email-verification responses: Audit 31.
- Login failed-attempt throttling, OTP per-mobile-only throttling, plain SHA-256 hashing of a six-digit OTP, and lack of broader IP/device/global controls: Audit 31.
- Raw bearer session token storage and client-side sessionStorage exposure: Audits 31 and 40.
- No global expired-session cleanup/retention evidence: Audit 38.

## Verification limits

This is a source-code review of the named branch only. No live login/logout, OTP, reset or password-change workflow was exercised. No production Edge Function, database/RLS state, session rows, provider configuration, build, automated tests, SQL, migration, deployment, GitHub Actions run or branch merge was performed. The report does not establish that deployed infrastructure exactly matches the reviewed source.

**Release decision: NOT PRODUCTION READY.** Fix and test logout revocation confirmation, close the carried-forward session invalidation and authentication abuse findings, and verify the deployed system before release.
