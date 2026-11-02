# Security Audit 71 — Admin Access Control, Privileged Operations, Role Separation and Step-Up Authentication

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Scope

Reviewed `admin-auth`, `admin-data`, `adminData.ts`, `AdminLogin.tsx`, `AdminDashboard.tsx`, `fcm-data` and `notification-ops`. Examined login/session issuance, server-side authorization, privileged action boundaries, frontend route checks, logout behavior, role checks and evidence of MFA/step-up controls.

## Executive summary

**New findings: 1 Medium.** The core `admin-data` endpoint has a meaningful server-side authorization gate: it validates the supplied session token and expiry, verifies that the token belongs to the supplied admin ID, and re-reads the admin row to require `role === "super_admin"` and `is_active === true`. `notification-ops` applies a comparable active-super-admin check.

However, the reviewed admin login is password-only and creates an eight-hour bearer session. No MFA, passkey, TOTP, re-authentication or step-up challenge was identified before sensitive administrative actions. This is the new finding. Other weaknesses (login throttling, custom-session logout revocation, broad super-admin privilege, and the separate FCM admin role check) have been raised in earlier audits and are carried forward rather than double-counted.

## Finding F71-01 — No MFA or step-up verification identified for privileged administrative operations

**Severity: Medium**

The `admin-auth` Edge Function accepts an email and password, verifies the bcrypt password hash, checks that the account is an active `super_admin`, and issues a random session token with an eight-hour expiry. The reviewed login UI collects only email and password. The reviewed `admin-data` authorization helper checks the existing session and active super-admin status, but does not require a recent re-authentication timestamp or a separate step-up proof for high-impact actions.

The same session gate protects a broad set of administrative actions, including booking status changes and assignment, technician activation/status changes, wallet recharge approval/rejection, payment reads, pricing changes, site settings, CRM reminders, content-draft state changes and marketplace configuration. The reviewed `admin-data` switch does not show a separate step-up verification check for these sensitive operations.

**Impact:** If an administrator's password or eight-hour bearer session is compromised, the attacker may be able to perform high-impact operations without a second factor or fresh confirmation of the administrator's identity. A session that was authenticated earlier remains sufficient for sensitive operations until expiry or server-side invalidation.

**Remediation:**
1. Require phishing-resistant MFA (prefer passkeys/WebAuthn) for all administrator accounts; TOTP may be a fallback.
2. Require step-up verification for financial actions, technician activation/suspension, booking terminal-state changes, payment/refund decisions, sensitive KYC access, and security/configuration changes.
3. Bind step-up proof to the admin ID, action class, short expiry and one-time nonce; reject replay and cross-action reuse.
4. Record `auth_time`/MFA assurance in the server-side session and verify freshness on the server for protected action classes.
5. Provide recovery codes and an audited recovery process; do not allow support staff to silently bypass MFA.
6. Add tests for missing, expired, replayed and wrong-action step-up proofs, as well as account suspension and session revocation after MFA changes.

## Positive controls observed

- `admin-auth` rejects invalid credentials and requires the admin database row to have `role === "super_admin"` and `is_active === true` before issuing a session.
- `admin-data` verifies the server-side `admin_auth_sessions` token, expiry, admin ID match, and current active-super-admin state for every request.
- `notification-ops` independently validates an unexpired admin session and active super-admin role before accepting admin notification operations.
- `adminData.ts` reads the admin ID and bearer token from sessionStorage but sends them to the server; client-side values are not treated as sufficient authorization by `admin-data`.
- Admin login stores the returned token and expiry in sessionStorage and removes the local keys if storage cannot be written.
- `AdminDashboard` checks local session presence/expiry for navigation, while privileged API requests still pass through server-side authorization.

## Carry-forward items — not counted as new

1. **Custom admin logout does not revoke the server-side admin session.** The dashboard logout calls `supabase.auth.signOut()` (the custom admin login does not create a normal Supabase Auth session), then clears local sessionStorage keys. No corresponding delete/revoke call to the custom `admin_auth_sessions` table was found in that handler. This was previously raised in Audit 33; Audit 71 reconfirms it.
2. **Admin login rate limiting / brute-force protection.** The reviewed `admin-auth` handler contains no visible per-account or per-IP attempt throttle. This was previously raised in Audit 33; not counted again.
3. **No operation-level role separation.** The reviewed admin-data endpoint applies one active `super_admin` gate to the complete action switch; no separate permission matrix or action-level role model is visible. This was previously raised in Audit 33; not counted again.
4. **FCM admin authorization role mismatch.** `fcm-data` checks admin session ownership and `is_active`, but does not require `role === "super_admin"`, unlike `admin-data` and `notification-ops`. This was previously raised in Audit 47; not counted again.
5. **Booking lifecycle transition validation.** The admin booking status action accepts a list of statuses and has previously identified transition-bypass concerns. This is carried forward from Audit 49 and related booking audits.

## Verification limits

This is a source-code review of the named branch. It does not prove production deployment state, test actual credential compromise, inspect database session rows, verify Cloudflare/WAF rate limits, or establish whether an external identity provider enforces MFA. No live admin account was accessed. No SQL, database changes, migration, build, automated test, deployment, GitHub Actions run, or merge was performed.

## Release decision

**NOT PRODUCTION READY.** Add enforced MFA and server-verified step-up authentication for high-impact administrative actions. Resolve the previously reported logout revocation, brute-force protection, operation-level authorization and FCM role-check issues, then verify the deployed controls before release.
