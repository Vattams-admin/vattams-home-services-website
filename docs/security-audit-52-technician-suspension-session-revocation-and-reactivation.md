# Security Audit 52 — Technician Suspension, Session Revocation and Reactivation

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Method: Read-only inspection of current technician-auth, technician-data and admin-data Edge Function source. No production sessions or technician accounts were accessed.

## Executive result

**NOT PRODUCTION READY.**

The technician-data endpoint re-reads the current technician status for each request and blocks protected actions unless the status is active. Admin status changes are restricted to an active super-admin session. These are useful controls.

However, login creates a seven-day session without checking that the technician status is active, and the admin status-change path does not revoke existing sessions. A suspended or inactive technician can therefore still receive a session; protected operations are blocked while the account remains non-active, but the old session remains valid and can become usable again if the account is reactivated before expiry.

## Findings

### F52-01 — MEDIUM: Technician login mints sessions for non-active accounts

**Evidence**
- supabase/functions/technician-auth/index.ts, handleLogin, loads the technician record and verifies the password.
- The login path does not check technician.status before minting a session.
- It creates a random session token with an expiry seven days in the future and inserts it into technician_auth_sessions.
- The returned technician object includes the account status, but the login endpoint itself does not reject pending, inactive, rejected or suspended accounts.
- supabase/functions/technician-data/index.ts subsequently re-reads the technician row and blocks protected actions whenever status is not active. Its account action still returns a restricted account response.

**Risk**
Non-active accounts can obtain valid bearer sessions and appear logged in even though protected functionality is denied. This expands the session population for rejected/suspended accounts and makes account state dependent on downstream checks being consistently applied to every protected endpoint.

**Remediation**
- Reject login unless the current account status is active, with a neutral and appropriate response for pending/rejected/suspended states.
- If pending applicants need portal access, issue a separate limited-scope application session that cannot authorize technician job, wallet or profile mutations.
- Add endpoint-level tests proving every technician action rejects non-active accounts.

### F52-02 — HIGH: Suspension and deactivation do not revoke existing technician sessions

**Evidence**
- supabase/functions/admin-data/index.ts, action technician_status, updates the technicians row for active, inactive, rejected and suspended states.
- The status handler does not delete or revoke rows in technician_auth_sessions and does not change a session-version/revocation field.
- technician-auth login creates sessions with a seven-day expiry. On a new login it attempts to delete all existing sessions for that technician before inserting the new one, but this is a login-time replacement mechanism, not an admin suspension/revocation mechanism; the delete result is not checked before proceeding.
- technician-data checks the current technician status on each request and blocks protected actions for non-active accounts. This limits immediate use while suspended, but the bearer session itself remains valid.
- If the same account is later changed back to active before the old session expires, the status gate no longer blocks that still-valid token. No reactivation-time session invalidation is present in the reviewed status handler.

**Risk**
Suspension is not a durable session revocation boundary. A previously issued token can regain access after reactivation without the technician authenticating again. This is particularly risky if the suspension followed suspected credential compromise, account takeover, misconduct or an offboarding request.

**Remediation**
- In one server-side transaction, set the account status and revoke all existing technician sessions when moving to inactive, rejected or suspended.
- Also invalidate sessions on reactivation, requiring a fresh password login and new token after the review decision.
- Add a session_version or revoked_at check to every technician-authenticated request, or enforce a durable token revocation table lookup.
- Check and handle errors from session deletion/revocation; do not report a successful suspension if revocation failed.
- Record the admin actor, prior status, new status, reason, timestamp and session-revocation result in an audit log.
- Test that a token issued before suspension remains unusable after reactivation and that concurrent requests cannot bypass the state transition.

## Positive controls observed

1. Technician sessions are opaque random tokens stored server-side, rather than using the technician ID as authentication.
2. Session expiry is set to seven days.
3. technician-data validates the session token and expiry against technician_auth_sessions.
4. technician-data re-reads the technician's current status for every request.
5. Non-active accounts are blocked from protected technician actions; the account response is restricted.
6. Admin technician status changes require a valid unexpired admin session and a current active super_admin role.
7. Admin status values are allowlisted to active, inactive, rejected and suspended.
8. Technician assignment checks that the technician is currently active before assignment, and the atomic assignment RPC performs an additional eligibility check.

## Existing findings deliberately not duplicated

- Audit 32 covered the broader technician-session bearer-token storage and client logout/revocation limitations. This audit focuses on the current login/status transition interaction and the reactivation reuse window.
- Audit 47 covered a different admin-role freshness issue in fcm-data.
- Audit 51 covered onboarding identity verification and the KYC review gate; neither is recounted here.

## Verification not performed

No live session was created, replayed or revoked. No production technician was suspended or reactivated. No database state, deployed Edge Function, RLS policy or migration deployment was inspected. No concurrency, API integration or browser test was run. No SQL, migration, build, deployment, GitHub Actions run or merge was performed.

## Required release gates

1. Deny full technician login for every non-active account.
2. Revoke all existing sessions atomically on suspension, rejection and deactivation.
3. Require fresh authentication after reactivation.
4. Add durable session revocation/version checks to every technician endpoint.
5. Add audit events and tests for suspend, revoke, reactivate, old-token replay and concurrent requests.
6. Verify deployed behavior before production release.

**Conclusion:** Current-status checks block technician operations while an account is non-active, but the login and admin status-transition paths do not provide durable session revocation. An old session can become usable again after reactivation while it remains unexpired. The marketplace remains NOT PRODUCTION READY.
