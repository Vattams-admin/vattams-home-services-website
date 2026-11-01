# Security Audit 86 — Password Security, Recovery, Credential Changes and Account Enumeration

**Repository:** Vattams-admin/vattams-home-services-website  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Review type:** Read-only authentication source review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**2 new findings:**
- **F86-01 — MEDIUM:** Customer password-reset and technician login responses disclose account existence through distinct response messages/statuses.
- **F86-02 — MEDIUM:** Customer and technician password policy accepts passwords as short as six characters; no stronger length or breached-password control is visible in the reviewed handlers.

Admin login uses a generic invalid-credentials response for missing accounts and incorrect passwords, which is a positive control. Customer login also uses a generic invalid-mobile-or-password response. These controls do not remove the separate recovery and technician-login enumeration channels.

## Scope and evidence

Reviewed:
- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/technician-auth/index.ts`
- `supabase/functions/admin-auth/index.ts`
- `src/pages/CustomerLogin.tsx`
- `src/pages/TechnicianLogin.tsx`
- `src/pages/AdminLogin.tsx`
- Session migration `20261005053000_add_customer_technician_auth_sessions.sql`
- Prior authentication and rate-limit reports, including Audits 31, 32, 33, 57, 58, 71 and 79.

## Findings

### F86-01 — MEDIUM: Customer password recovery and technician login expose account existence

**Customer recovery evidence**
- The customer-auth `forgot-password` action looks up the supplied mobile number.
- An unknown mobile receives `No account found with this mobile number`.
- An existing account without a verified email receives a separate response.
- A valid account receives an email OTP and a success message.
- The endpoint therefore provides a distinguishable account-existence signal to unauthenticated callers.

**Technician login evidence**
- The technician-auth `handleLogin` lookup returns HTTP 404 and a message identifying whether the submitted email or mobile has no account.
- A known account with a missing password hash returns a separate HTTP 400 response.
- A known account with an incorrect password returns HTTP 401 and `Incorrect password`.
- These response differences allow unauthenticated callers to distinguish unknown identifiers from registered accounts.

**Impact**
An attacker can enumerate registered customer mobile numbers and technician email/mobile identifiers. This can enable targeted phishing, credential-stuffing prioritization and privacy-invasive account discovery.

**Recommended remediation**
- Return a uniform recovery response regardless of whether the account exists or has a verified email; deliver the OTP only when eligible.
- Return a generic technician login failure for unknown identifier, missing password hash and incorrect password.
- Keep detailed diagnostics in protected server logs without including credentials or OTPs.
- Apply layered IP, device and identifier-based rate limits, monitoring and alerting. Audit 79 already records missing login throttling; this finding does not duplicate the throttling issue.

### F86-02 — MEDIUM: Customer and technician passwords may be only six characters long

**Evidence**
- Customer-auth `validatePassword` rejects passwords only when length is below six.
- Customer registration and password reset/change call this validator.
- Technician registration requires password length of at least six characters before hashing.
- Technician account creation also applies a six-character minimum in the reviewed registration path.
- Both flows use bcrypt with a cost/work factor corresponding to 10 rounds in the inspected code.
- No stronger minimum, breached-password screening, passphrase guidance or password-strength policy is visible in these handlers.
- Admin-auth verifies bcrypt hashes but does not expose an admin password reset/change flow in the reviewed file; the customer/technician six-character policy is not asserted for admin accounts.

**Impact**
A six-character minimum permits weak and guessable passwords. Bcrypt slows offline guessing but does not compensate for a weak password choice, particularly if password hashes are exposed.

**Recommended remediation**
- Adopt a modern passphrase-oriented minimum length (at least 12 characters where compatible with the product) and allow long passwords.
- Avoid arbitrary composition rules; block commonly used and known-compromised passwords.
- Add consistent policy enforcement to registration, reset and change-password paths, and communicate it clearly in the UI.
- Consider rehash-on-login when increasing bcrypt work factor, with performance testing in the deployed Edge Function environment.

## Recovery and credential-change observations

### Customer recovery

- Forgot-password OTP is sent to the email associated with the supplied mobile.
- OTP is stored as a SHA-256 digest, has a ten-minute expiry and is limited to five failed verification attempts through an RPC.
- The reset action requires a previously verified OTP and consumes the verified OTP row before updating the password.
- The reset action checks that the verified OTP was created within 30 minutes; it does not re-check the stored `expires_at` at reset time. This appears to implement a separate post-verification window and should be explicitly documented and tested.
- If the password update fails after the OTP row has been consumed, the customer must request a new OTP.
- Password reset does not revoke other active customer sessions; this is a previously recorded issue (Audit 57), not counted again here.

### Customer change password

- Requires a valid unexpired customer session and the current password.
- Verifies the current password with bcrypt and updates the password hash.
- Does not revoke other active customer sessions; carry-forward from Audit 57.

### Technician credentials

- Technician registration hashes passwords with bcrypt.
- No technician forgot-password or change-password action was identified in the reviewed technician-auth handler.
- The UI and backend should provide a secure recovery path before launch if technicians are expected to self-manage credentials. Absence in the inspected handler is not proof that no separate recovery workflow exists elsewhere in the repository.

### Admin credentials

- Admin login uses a generic `Invalid credentials` response for unknown account and wrong password.
- The handler checks active super-admin role after successful password verification.
- No admin recovery/change-password action was identified in the inspected admin-auth function. Admin credential lifecycle should be documented and tested separately.

## Positive controls

1. Customer login returns the same generic invalid-mobile-or-password response for missing customer and wrong password.
2. Admin login returns a generic invalid-credentials response for unknown admin and incorrect password.
3. Customer and technician passwords are bcrypt-hashed; plaintext passwords are not returned in login responses.
4. Customer reset requires verified, single-use OTP evidence.
5. Customer and technician OTP verification uses expiry checks and an atomic attempt-counter RPC.
6. Technician login removes password_hash from the returned technician profile.

## Verification limits

- Source review only; no live endpoint probing, account enumeration test, credential-stuffing test, password cracking, OTP replay test or email delivery test.
- No live database, deployed Edge Function, rate-limit infrastructure or provider configuration inspected.
- No password hashes or user records were accessed.
- No build, tests, SQL, migration, deployment, GitHub Actions execution, code remediation or merge performed.
- Prior audit findings are carried forward rather than counted again.

## Release decision

**NOT PRODUCTION READY.** Customer recovery and technician login reveal account existence, and the customer/technician password minimum is weak. Fix the response discrepancies, strengthen password policy and verify recovery/session-revocation behavior before production release.
