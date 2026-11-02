# Security Audit 45 — Authentication and Session Lifecycle

Audit date: 2026-10-31  
Branch: security/frontend-backend-contract-audit-2026-10-31  
Scope: Customer, technician and administrator login, password recovery/change, custom sessions and logout.  
Method: Read-only repository source review. No production login, database inspection or mutation was performed.

## Executive result

**NOT PRODUCTION READY.**

The repository implements three separate custom authentication flows. Customer and technician sessions expire after seven days; administrator sessions expire after eight hours. Passwords are hashed with bcryptjs at cost 10 in the inspected paths. Customer logout deletes its server session. Technician logout only clears browser storage, and administrator logout calls Supabase Auth signOut before clearing browser storage even though the custom admin token is stored in admin_auth_sessions. Customer password reset/change does not revoke existing sessions. Technician and administrator recovery flows were not found in the reviewed auth endpoints. All roles need a consistent password and session lifecycle policy.

## Findings

### F45-01 — HIGH: Technician and administrator logout do not revoke custom server sessions

**Evidence**
- supabase/functions/technician-auth/index.ts creates a technician_auth_sessions row with a seven-day expiry. Its action router has no logout/revoke action.
- src/pages/TechnicianDashboard.tsx logout removes local session and identity keys only.
- supabase/functions/admin-auth/index.ts creates an admin_auth_sessions row with an eight-hour expiry.
- src/pages/AdminDashboard.tsx calls supabase.auth.signOut() and clears custom admin sessionStorage keys; it does not delete the corresponding admin_auth_sessions row.
- The custom admin session is checked by admin-data and related custom-session functions; Supabase Auth signOut is not equivalent to deleting that row.

**Risk**
Logging out does not invalidate the technician/admin bearer token on the server. A copied token can remain usable until expiry or separate revocation.

**Remediation**
- Add server-side logout actions for technician and admin, deleting/revoking only the authenticated current session.
- Add revoke-all-sessions for account compromise.
- Test that tokens are rejected immediately after logout from another browser/device.

### F45-02 — HIGH: Customer password reset and change do not revoke active sessions

**Evidence**
- customer-auth reset-password consumes a verified forgot_password OTP and updates customers.password_hash.
- customer-auth change-password verifies the current password and updates customers.password_hash.
- Neither path deletes or revokes customer_auth_sessions rows.
- Customer sessions last seven days and customer-data authorizes requests by session token and expiry.

**Risk**
Previously issued customer tokens can continue to authorize requests after the account owner resets or changes the password. Password change therefore does not contain a stolen active session.

**Remediation**
- Revoke existing customer sessions after password reset and password change.
- Perform password update and revocation atomically.
- Notify the verified contact channel and test that old tokens fail immediately.

### F45-03 — MEDIUM: Technician and administrator recovery/change workflows are absent from reviewed authentication endpoints

**Evidence**
- technician-auth exposes registration OTP, resend-registration-otp, verify-registration-otp, login and doc-url actions; no forgot-password, reset-password or change-password action was found.
- admin-auth implements credential verification and custom session creation only; no password reset/change action was found.
- Customer auth separately implements forgot-password, verify-otp, reset-password and change-password.

**Risk**
Technicians and administrators who lose access or need to rotate a compromised password lack a repository-backed recovery path in the reviewed flows. An external support process may exist, but it was not evidenced here.

**Remediation**
- Define verified recovery workflows for both roles.
- Require additional approval and auditable controls for administrator recovery.
- Revoke sessions and record a security event after recovery.

### F45-04 — MEDIUM: Password policy permits a six-character minimum

**Evidence**
- customer-auth validatePassword rejects only passwords shorter than six characters.
- CustomerForgot.tsx repeats the six-character minimum client-side.
- technician-auth registration validation also requires six characters.
- Admin-auth verifies bcrypt hashes but no stronger policy is enforced in the inspected login function.
- Bcryptjs cost 10 is used in the inspected customer/admin and technician registration flows.

**Risk**
A six-character minimum permits weak passwords, especially alongside the lack of visible app-level failed-login throttling identified in earlier audits. Bcrypt hashing is a positive control but does not compensate for weak passwords or missing abuse controls.

**Remediation**
- Adopt a current long-passphrase policy, reject common/compromised passwords and support password managers.
- Enforce policy server-side for every role.
- Pair password controls with consistent server-side rate limiting and generic login errors.

### F45-05 — MEDIUM: Session lifecycle and token storage are inconsistent across roles

**Evidence**
- Customer and technician sessions expire after seven days; admin sessions expire after eight hours.
- Customer and technician login delete existing sessions for that account before inserting a new row; admin login inserts a session without the same replacement behavior.
- The three frontend login flows store bearer tokens in JavaScript-readable sessionStorage.
- Session rows store the raw token in customer_auth_sessions, technician_auth_sessions and admin_auth_sessions in the reviewed insert paths.
- Customer login returns a generic credential error, while technician login distinguishes missing account and incorrect password.
- No shared cross-role session policy was identified.

**Risk**
Different expiry, replacement and error-response rules complicate incident response and make session behavior harder to reason about. Raw token storage increases replay impact if a session table is exposed. sessionStorage is also readable by same-origin JavaScript, a browser boundary already covered in Audit 40.

**Remediation**
- Define a shared role-aware policy for expiry, idle timeout, concurrent sessions, logout and password-change revocation.
- Store a cryptographic hash of session tokens server-side and compare hashes during authorization.
- Standardize authentication errors and abuse limits.
- Record session creation/revocation events without recording raw tokens.

## Positive controls

1. Bcrypt password hashing is used in the reviewed authentication flows.
2. Customer and technician session tokens are generated from cryptographically random UUIDs.
3. Customer logout calls a server endpoint that deletes the supplied token.
4. Customer reset requires a verified OTP and consumes the OTP row before updating the password.
5. Customer change-password verifies the current password.
6. Admin login requires super_admin role and active status.
7. Admin session validation checks token, admin ID, expiry, role and active status.
8. Technician protected data endpoints check server-side session expiry and active account status.
9. Customer login uses a generic invalid mobile/password response.

## Verification not performed

- No live login/logout/reset/change requests or production session inspection.
- No brute-force or credential-stuffing test.
- No password-hash sample inspection.
- No external support recovery workflow inspection.
- No production database, SQL, migration, Edge Function change, deployment, GitHub Actions run or merge.

## Required release gates

1. Implement server-side technician/admin logout and revocation.
2. Revoke customer sessions atomically after password reset/change.
3. Implement secure technician/admin recovery/change flows.
4. Strengthen consistent password policy and login abuse protection.
5. Standardize session lifecycle and hash bearer tokens at rest.

**Conclusion:** Customer OTP recovery and bcrypt hashing are useful controls, but custom technician/admin sessions survive local logout, customer password changes do not invalidate sessions, technician/admin recovery paths are absent from reviewed functions, and session policies are inconsistent. The marketplace remains **NOT PRODUCTION READY**.
