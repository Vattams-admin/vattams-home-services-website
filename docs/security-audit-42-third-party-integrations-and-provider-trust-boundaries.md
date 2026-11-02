# Security Audit 42 — Third-Party Integrations and Provider Trust Boundaries

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Firebase client configuration and Cloud Messaging, Supabase client keys, Resend email OTP delivery, payment provider integration/callbacks, FCM service-account handling, external API error handling and integration authorization.  
**Method:** Read-only source review of frontend integration modules, Supabase Edge Functions and package metadata. Secret values are intentionally not reproduced. No provider dashboards, secret stores, live webhooks, external service accounts or production logs were accessed.

## Executive result

**Release status: NOT PRODUCTION READY.**

The inspected frontend uses Firebase and Supabase public client configuration as expected; the reviewed frontend source contains the Supabase anon key but no service-role key. Privileged Supabase and FCM service-account credentials are read from Edge Function environment variables. The FCM send endpoint checks the exact service-role bearer before using the Firebase service account, and the email OTP sender reads its Resend API key from the server environment.

The principal remaining gaps are integration authorization and operational assurance: the FCM data endpoint checks that an admin account is active but does not enforce the `super_admin` role; payment processing has no provider callback/signature verification in the reviewed flow and depends on manual UTR approval; Resend provider error bodies are written to logs; and provider credential rotation, delivery reconciliation and external integration health controls are not demonstrated.

## Findings

### F42-01 — MEDIUM: FCM device-token operations do not enforce the super_admin role for admin sessions

**Evidence**
- `supabase/functions/fcm-data/index.ts` authenticates admin requests by looking up `admin_auth_sessions`, matching the supplied admin ID and checking the related `admin_users.is_active` value.
- The admin branch does not check `admin_users.role === 'super_admin'`.
- The same endpoint supports `register`, `unregister`, `unregister_user` and `list` operations on FCM tokens.
- Other reviewed privileged admin endpoints, including `admin-data`, `payment-auth` and the KYC `doc-url` action, explicitly check the `super_admin` role.

**Risk**
If the application has active admin accounts with roles below super_admin, those accounts may be able to register, list or deactivate device tokens through this endpoint, despite the stronger role boundary used by other admin operations. The practical impact depends on the actual admin role population and whether lower-privilege admin sessions can be issued; neither was inspected in production.

**Required remediation**
- Enforce the same explicit `super_admin` check used by other privileged functions, or define and enforce a documented least-privilege role matrix for each FCM operation.
- Restrict list/unregister operations to the authenticated admin's own devices unless a specific privileged administrative workflow requires broader scope.
- Add negative tests for inactive, expired, mismatched-ID and non-super-admin sessions.

### F42-02 — HIGH: Payment confirmation lacks an independently authenticated provider callback in the reviewed integration

**Evidence**
- `supabase/functions/payment-auth/index.ts` creates a pending ₹49 technician registration payment record and accepts a submitted UTR using a payment-specific action token.
- The `verify` action authorizes an active super-admin and allows a pending payment with a non-null UTR to be marked successful.
- The source comment explicitly states that a UTR is not independent bank settlement evidence and must be reconciled by an administrator.
- The reviewed repository payment flow contains no payment-provider webhook handler, provider signature verification, provider transaction lookup or bank settlement import for this registration payment flow.
- `PaymentModal.tsx` instructs the applicant that the payment will be verified by the team.

**Risk**
The application state is based on human review of a user-submitted transaction reference rather than a cryptographically authenticated provider settlement event. Manual reconciliation can be error-prone and difficult to scale; a UTR alone does not prove that the expected amount reached the intended merchant account. This finding is limited to the reviewed repository flow and does not establish whether a separate bank reconciliation process exists outside the repository.

**Required remediation**
- Integrate a supported payment provider or verified bank reconciliation source.
- Verify webhook signatures using provider-defined signing rules, enforce timestamp/replay windows and persist provider event IDs with unique idempotency constraints.
- Reconcile amount, currency, payee/merchant account, payment intent and final settlement status server-side before activating registration.
- Retain manual review as an exception workflow with evidence and dual-control approval where appropriate.
- Test forged callbacks, replayed events, duplicate delivery and amount/payee mismatch.

### F42-03 — MEDIUM: Resend provider error response bodies are logged without explicit redaction

**Evidence**
- `supabase/functions/customer-auth/index.ts` logs `await response.text()` when Resend rejects OTP delivery.
- `supabase/functions/technician-auth/index.ts` also logs the Resend response body on provider rejection.
- These functions send OTPs and process account registration/password-reset requests.
- The inspected code does not apply a structured allowlist/redaction pass to the provider response text before logging.

**Risk**
Provider error bodies may contain recipient addresses, request identifiers, account metadata or other operational details. Logging the raw body increases the amount of personal/provider data retained in logs and can expose information to anyone with log access. No evidence was found that the response includes the API secret itself; this finding does not claim that a credential was logged.

**Required remediation**
- Log only provider status, a bounded provider error code, correlation ID and a sanitized message.
- Do not log raw provider response bodies, OTPs, authorization headers or recipient data.
- Define log access, retention and redaction controls for production function logs.
- Add tests that ensure provider error payloads containing email addresses or arbitrary text are not copied verbatim into logs.

### F42-04 — MEDIUM: External provider delivery lacks demonstrated timeout, retry and reconciliation controls

**Evidence**
- The Resend OTP calls use `fetch()` without an explicit AbortSignal timeout or bounded retry policy in the reviewed functions.
- FCM send calls use external OAuth token and FCM HTTP requests; the reviewed code handles response failures and deactivates tokens for selected invalid-token responses, but no durable provider-event/outbox reconciliation mechanism was identified.
- Notification records are created with status `sent` before the push call completes; push outcomes are returned separately. This delivery-state issue was also identified in Audit 37.
- No provider health/latency budget, circuit breaker or dead-letter/reconciliation workflow was found in the reviewed integration files.

**Risk**
Provider stalls or transient failures can tie up Edge Function execution or cause OTP/push delivery to fail without a durable retry path. Notification database state may not represent actual external delivery. This can result in missing OTPs, delayed user notifications and inconsistent operational reporting.

**Required remediation**
- Apply explicit request timeouts and bounded retry/backoff for retry-safe provider operations.
- Use a durable outbox with delivery attempts, provider message IDs, terminal status and reconciliation.
- Make retry behavior idempotent and prevent duplicate OTP issuance or duplicate business notifications.
- Monitor provider error rates, latency, quota exhaustion and delivery failures.

### F42-05 — LOW/MEDIUM: Firebase service-account credential lifecycle and least-privilege controls are not evidenced in repository configuration

**Evidence**
- `send-push-notification/index.ts` reads `FCM_SERVICE_ACCOUNT_JSON` from the Edge Function environment and uses its `project_id`, `client_email` and `private_key` to mint an OAuth access token for the Firebase Messaging scope.
- The function verifies that these required fields exist, but the repository does not document service-account key rotation, emergency revocation, ownership, access review or environment separation.
- The send endpoint correctly requires the exact `SUPABASE_SERVICE_ROLE_KEY` bearer before processing requests.
- No secret values are included in this report; no secret-store configuration or provider IAM policy was accessible in this source-only review.

**Risk**
A long-lived service-account private key can become a high-impact credential if copied into an unauthorized environment or exposed through logs, backups or deployment configuration. Absence of lifecycle evidence is a governance/verification gap, not proof that the key is currently mishandled.

**Required remediation**
- Prefer workload identity or short-lived provider credentials where supported; otherwise rotate service-account keys on a defined schedule and after personnel/access changes.
- Restrict the service account to Firebase Cloud Messaging permissions required by this application.
- Separate development/staging/production credentials and restrict who can read or change function secrets.
- Document revocation, incident response and secret rotation procedures.
- Periodically verify that no service-role or provider private key is present in frontend bundles, Git history, build artifacts or logs.

## Positive controls observed

1. The inspected frontend Supabase client uses the public anon key; source comments explicitly prohibit embedding a service-role key in frontend code.
2. Firebase browser configuration is supplied through Vite public environment variables and is treated as client configuration, not a private service-account credential.
3. Resend API credentials are read from Edge Function environment variables rather than imported into frontend modules.
4. FCM service-account JSON and its private key are read server-side from `FCM_SERVICE_ACCOUNT_JSON`.
5. The push-send endpoint requires an exact service-role bearer before accessing device tokens or calling FCM.
6. FCM OAuth requests use the Firebase Messaging scope rather than a broad Google API scope.
7. FCM data operations derive customer ownership from the authenticated customer session rather than trusting a supplied mobile number.
8. Technician and customer email OTP flows enforce expiry and bounded failed verification attempts in the reviewed handlers.
9. Payment verification checks an unexpired admin session and active super-admin role before changing payment state.
10. Payment code explicitly recognizes that a UTR is not independent bank settlement evidence.

## Verification not performed

- No Firebase, Resend, Supabase or payment-provider console inspection.
- No secret-store inventory, key rotation review or IAM permission review.
- No external payment-provider webhook or bank settlement integration test.
- No Resend or FCM live delivery test.
- No production logs or log-retention inspection.
- No live admin-role population inspection.
- No dependency vulnerability scan or software bill of materials review.
- No production deployment, database change, SQL execution, GitHub Actions run or merge.

## Required release gates

1. Enforce explicit role authorization on FCM admin token operations.
2. Implement provider-authenticated payment settlement verification and replay-safe webhook processing.
3. Redact provider error bodies and sensitive values from logs.
4. Add bounded timeouts, retry and durable delivery reconciliation for email/push integrations.
5. Verify provider service-account least privilege, secret rotation and environment separation.

**Conclusion:** Audit 42 is complete as a repository-source review. Public frontend keys are not treated as private secrets, and privileged credentials remain server-side in the inspected code. However, FCM admin role enforcement is inconsistent, payment settlement is not backed by a provider-authenticated callback in the reviewed flow, and provider delivery/logging/credential-lifecycle controls need further work. The marketplace remains **NOT PRODUCTION READY**.
