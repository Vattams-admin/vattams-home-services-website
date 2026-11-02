# Security Audit 85 — Cross-Role Session Lifecycle

**Repository:** Vattams-admin/vattams-home-services-website  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Review:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**New findings: 0.** Customer, technician and admin login flows issue opaque server-side session records with explicit expiry. Protected API paths perform server-side checks. Earlier findings about logout, revocation, token storage and suspension remain open and are carried forward rather than duplicated.

## Scope

Reviewed customer-auth, technician-auth and admin-auth Edge Functions; CustomerLogin, CustomerProfile, TechnicianLogin, TechnicianDashboard, AdminLogin and AdminDashboard; session-table migrations 20261005050000 and 20261005053000; and prior audits 31, 32, 33, 40, 45, 52, 57, 58 and 77.

## Customer lifecycle

- Login verifies bcrypt password and creates an opaque token using two UUIDs with a seven-day expiry.
- It attempts to delete prior customer sessions before insertion but does not inspect the delete result.
- The browser stores token, profile and expiry in sessionStorage.
- Customer API authorization checks the server-side session and expiry.
- The logout endpoint deletes by token but does not inspect the delete error or affected-row result before returning success.
- CustomerProfile clears local storage and navigates away before attempting best-effort server logout; network failure is swallowed.
- No refresh/session-extension action was identified.
- **Carry-forward:** Audit 57 F57-01 logout revocation is not confirmed; Audit 31/57 password reset/change does not revoke all existing sessions.

## Technician lifecycle

- Login creates an opaque token from two UUIDs with a seven-day expiry.
- It attempts to delete prior technician sessions but does not inspect the result.
- A session can be minted for a non-active technician; technician-data checks current account status for protected actions.
- Token and expiry are stored in sessionStorage.
- TechnicianDashboard logout removes local values only; no server-side logout action was found in the reviewed flow.
- No technician password recovery or session-refresh action was identified.
- **Carry-forward:** Audit 32 local-only logout; Audit 52 suspension/revocation and reactivation risk; Audit 58 inactive-account issuance and unchecked prior-session deletion.

## Admin lifecycle

- admin-auth creates an opaque UUID session with an eight-hour expiry and handles insert errors.
- Protected admin API code validates token, admin ID, expiry and current active super_admin status.
- AdminLogin stores token and identity/expiry metadata in sessionStorage.
- AdminDashboard calls Supabase Auth signOut, then clears custom admin session storage. The reviewed custom admin-auth route has no corresponding logout action deleting the admin_auth_sessions record.
- No refresh action was identified.
- Migration source enables RLS and revokes anon/authenticated table privileges; deployed state was not inspected.
- **Carry-forward:** Audit 33 custom admin session revocation; Audit 71 MFA/step-up and privileged access controls.

## Cross-role token storage

All three roles store their custom session token in browser sessionStorage. This reduces persistence beyond the browser session in common circumstances, but does not prevent same-origin JavaScript or XSS from reading the token. Local expiry is a UX check; server-side expiry and account-state checks must remain authoritative. Audit 40 already records this browser-storage exposure.

No refresh-token rotation mechanism was identified in the reviewed custom-session paths. This is a design observation, not a new finding.

## New findings

**0.** This is a consolidated verification pass. Previously recorded weaknesses are not counted again.

## Carry-forward register

| Prior audit | Unresolved issue |
|---|---|
| 57 | Customer logout returns success without confirming database revocation; client logout is best-effort |
| 32 | Technician logout is local-only; server session remains until expiry or other revocation |
| 33 | Admin custom session has no matching server-side logout/revocation action in reviewed flow |
| 31, 57 | Customer password reset/change does not revoke other sessions |
| 52, 58 | Technician suspension/session revocation and inactive-account session issuance |
| 40 | Browser-readable session tokens are exposed to same-origin script execution |
| 45 | Retain cross-role authentication baseline |

## Required remediation

1. Add server-side logout/revocation for all custom session types and distinguish confirmed revocation from local sign-out.
2. Check database delete errors and test token replay after logout.
3. Revoke sessions after password reset/change, suspension, privilege downgrade and suspected compromise.
4. Make any one-active-session policy atomic and fail safely when prior-session invalidation fails.
5. Evaluate Secure, HttpOnly, SameSite cookies where architecture and cross-origin requirements permit.
6. If refresh is introduced, rotate tokens, detect reuse and provide global session revocation.
7. Add regression tests for expiry, revocation, replay, concurrent login, disabled accounts and multi-device sessions.

## Verification limits

Source review only. No live authentication/logout/replay/refresh tests, production database or deployed Edge Function inspection, browser security test, build, lint, automated test, SQL, migration, deployment, workflow execution or merge was performed. Deployed production may differ from this branch.

## Release decision

**NOT PRODUCTION READY.** All roles have expiring server-side session records and server-side authorization checks, but logout/revocation remains incomplete or unconfirmed. SessionStorage exposure and account-state/session invalidation gaps remain open.