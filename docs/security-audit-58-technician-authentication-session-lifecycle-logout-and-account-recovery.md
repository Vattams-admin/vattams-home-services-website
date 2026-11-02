# Security Audit 58 — Technician Authentication, Session Lifecycle, Logout and Account Recovery

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope and executive result

Reviewed `technician-auth`, `technician-data`, technician login/dashboard UI, the technician API wrapper and the customer/technician session-table migration. This audit focused on login, session issuance and expiry, logout, account recovery, and suspended/inactive account behavior.

**New security findings: 0.** The reviewed source confirms several unresolved findings already recorded in Audits 32 and 52. These are explicitly carried forward and are not counted again. A technician password recovery workflow was not found; this is documented as a product/recovery gap, not counted as a security exploit.

## Existing controls observed

- Technician login verifies the supplied password against a bcrypt hash.
- Login creates a high-entropy opaque token using two concatenated UUIDs and stores it in `technician_auth_sessions` with a seven-day expiry.
- The login response excludes `password_hash`.
- The technician session table has a unique token, technician foreign key, expiry and supporting indexes. RLS is enabled and anon/authenticated table privileges are revoked in the reviewed migration.
- `technician-data` resolves the technician identity from the server-side session token and rejects missing or expired sessions.
- `technician-data` checks the current technician account status on every request. Protected actions are rejected unless status is active; an inactive account can only receive the limited account/status response.
- The technician dashboard obtains protected data through `technician-data`; it does not use a caller-supplied technician ID as the authorization identity.

## Carry-forward items — unresolved, not counted as new

### C58-01 — Login mints sessions for non-active technician accounts

**Original finding:** Audit 52.  
The current `handleLogin` implementation verifies the password and creates a seven-day session without requiring `technician.status === "active"`. The login UI routes non-active users to the application-status page, and technician-data blocks protected actions while the account is not active. Audit 52 also recorded that suspension does not revoke existing sessions, which can become usable again after reactivation. This remains unresolved in source; no duplicate finding is added here.

### C58-02 — Technician logout clears only browser storage

**Original finding:** Audit 32.  
The dashboard `logout` handler removes the technician session and related values from sessionStorage and navigates to the login page. It does not call a server-side logout endpoint or delete the matching `technician_auth_sessions` row. A copied token can therefore remain valid server-side until expiry or another revocation event. This is a carry-forward, not a new finding.

### C58-03 — Login does not verify removal of prior sessions

The current login handler issues a delete for existing sessions belonging to the technician, then inserts a new session, but does not inspect the delete result. The apparent single-session policy is therefore not guaranteed if that delete operation fails. This behavior is recorded as a verification/remediation note under the session lifecycle findings, not separately counted because the earlier audits already cover session revocation and lifecycle weaknesses. Add a regression test and make the intended single-session policy explicit.

### C58-04 — Authentication abuse and account-enumeration controls

**Original finding:** Audit 32.  
Login returns distinguishable responses for an unknown account and an incorrect password, and no app-level failed-login throttle was found in the reviewed handler. These are previously recorded concerns and are not counted again.

## Account recovery capability gap

The reviewed `technician-auth/index.ts` implements technician registration OTP verification, login and an admin-protected document URL flow. No technician forgot-password, password-reset, or change-password action was found. The reviewed `TechnicianLogin.tsx` presents the login form but no forgot-password route or recovery flow.

This means a technician who forgets a password appears to require support intervention. It is a product availability and account-recovery gap, not evidence of an unauthorized password reset. If self-service recovery is added, it should use a verified recovery channel, short-lived single-use challenges, rate limits, generic account responses and session revocation after reset.

## Required remediation priorities

1. Add a server-side technician logout action that deletes the token and confirms revocation; invoke it before or alongside local cleanup and surface an unconfirmed result.
2. Revoke all existing technician sessions when an account is suspended, rejected or otherwise disabled; ensure reactivation does not revive old tokens.
3. Decide whether only active technicians may mint a full session. If non-active users need application-status access, issue a distinct restricted session/capability.
4. Check and handle the existing-session deletion result during login; test concurrent login and deletion failure.
5. Add server-side login throttling and generic account/password errors.
6. Implement a secure technician password recovery process if self-service recovery is required.
7. Add tests for expired/revoked tokens, suspension/reactivation, logout replay, multiple sessions, failed session deletion, unknown account, wrong password, and password recovery.

## Verification limits

This is a source-code review of the named branch only. No live technician login/logout, session replay, account suspension/reactivation, password recovery, or API authorization test was performed. No production Edge Function, database/RLS state, session rows, provider configuration, build, automated tests, SQL, migration, deployment, GitHub Actions run or branch merge was performed. The report does not establish that deployed infrastructure exactly matches the reviewed source.

**Release decision: NOT PRODUCTION READY.** Close the carried-forward session issuance/revocation findings and provide a verified recovery path before release.
