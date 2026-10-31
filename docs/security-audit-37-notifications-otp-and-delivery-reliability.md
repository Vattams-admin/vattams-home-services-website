# Security Audit 37 — Notifications, OTP Communications and Delivery Reliability

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Notification authorization and recipient isolation, push-token lifecycle, FCM delivery, OTP generation/verification/email delivery, SMS/WhatsApp claims, delivery state and operational reliability.  
**Method:** Read-only source and migration review. No live provider configuration, production database, FCM project, Resend account, Cloudflare configuration or deployed function was inspected.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository has meaningful controls: notification tables are locked from direct anon/authenticated access in a later migration; customer and technician dashboards read notifications through authenticated Edge Functions; push delivery requires the Supabase service-role bearer; FCM token registration is session-bound; OTPs are hashed, expire after ten minutes, and failed attempts are atomically capped at five.

However, material gaps remain: customer/technician callers can invoke notification-ops to create arbitrary self-directed notification content and reference metadata; notification rows are persisted as `sent` before actual push delivery is established; push failures are not durably reconciled; FCM token listing returns raw device tokens; OTP throttling is only a 60-second per-mobile/purpose check with no visible IP/device/global limits; and no SMS/WhatsApp delivery implementation was found in the reviewed function set.

## Findings

### F37-01 — HIGH: Authenticated users can create arbitrary notifications to themselves through notification-ops

**Evidence**
- `supabase/functions/notification-ops/index.ts` accepts a caller-supplied `input` containing recipient type/id, title, message, type, reference type/id and channels.
- Customer sessions are checked against the customer's mobile recipient ID; technician sessions are checked against their technician ID. This protects against choosing another recipient.
- After authorization, the handler accepts caller-controlled title/message/type/reference metadata and inserts the row. It does not enforce an allowlist of notification types, reference types, reference ownership, or permitted channels for customer/technician callers.
- It permits a caller-supplied `channels` array; if it includes `push`, the handler dispatches push to that same caller.

**Risk**
A valid customer or technician session can generate arbitrary notification text and deep-link metadata for their own account. This creates a self-notification/spam path, can pollute notification history, and may cause unsafe or misleading notification content/deep links. Recipient isolation alone is not sufficient authorization for notification creation.

**Required remediation**
- Remove customer/technician access to generic notification creation, or implement strict per-role event allowlists.
- Derive title, message, type, reference and destination server-side from a validated business event.
- Validate reference ownership and state before creating a notification.
- Make channel selection server-controlled; add per-recipient and per-IP rate limits and idempotency keys.

### F37-02 — HIGH: Notification status records enqueue/creation as sent before actual delivery

**Evidence**
- `notification-ops` inserts a notification row with `status: "sent"` before attempting push delivery.
- It subsequently calls `send-push-notification` and returns a `pushDelivery` result, but does not update the persisted notification status based on push outcomes.
- The notification schema allows `sent`, `delivered`, `read` and `failed`, but the reviewed code does not establish a durable per-channel delivery-attempt ledger or retry queue.
- Booking flows also insert notifications and treat push as best-effort; the code logs failures but does not create a durable retry record.

**Risk**
The database can report a notification as sent even when FCM credentials are missing, all device tokens fail, or the push call errors. Operators cannot reliably distinguish queued, accepted by provider, delivered to device, read, or failed. Lost notifications may not be retried or reconciled.

**Required remediation**
- Separate notification creation from channel delivery state.
- Record per-channel attempts, provider message IDs, response/error codes, timestamps and retry schedule.
- Use a durable outbox/queue and idempotent worker.
- Define precise status semantics; never label a notification delivered based only on provider acceptance.
- Add dead-letter handling and operational alerts for persistent failures.

### F37-03 — MEDIUM: FCM token listing exposes raw device tokens to the account session

**Evidence**
- `supabase/functions/fcm-data/index.ts` authorizes the account session and scopes the `list` action to the derived owner ID.
- The list action returns the raw `token` values for active devices.
- The register action accepts a token up to 4096 characters and stores it under the server-derived owner ID; unregister actions are owner-scoped.

**Risk**
Ownership scoping is positive, but raw push tokens are bearer-like device addressing identifiers. Returning them to browser code increases exposure through XSS, logs, browser extensions, client telemetry or accidental display. The UI generally needs registration state/device labels, not the raw token.

**Required remediation**
- Remove raw token listing from ordinary client flows; return only device metadata and token presence/status.
- Keep token values server-side and redact them from logs and API responses.
- Add token format validation, per-account device limits, last-seen timestamps and device-revocation UX.
- Review whether the unique key and cleanup behavior prevent token reuse across accounts and stale-device buildup.

### F37-04 — MEDIUM: OTP throttling is limited to a 60-second per-mobile/purpose cooldown

**Evidence**
- `customer-auth` and `technician-auth` check for a recent OTP row for the same mobile and purpose within 60 seconds before sending/resending.
- Customer and technician OTP verification use ten-minute expiry, SHA-256 hashes, five-attempt checks, and the service-role-only atomic `increment_otp_attempt_count` RPC.
- The inspected code does not demonstrate IP, device, network, daily per-account, destination-domain, or global provider spend limits.
- The resend routes are keyed by mobile and purpose; no broader abuse budget is visible in the reviewed handlers.

**Risk**
A per-mobile cooldown does not prevent distributed abuse across many mobile numbers, IP rotation, provider-cost exhaustion or targeted email flooding. Hashing the OTP does not replace issuance-rate controls.

**Required remediation**
- Apply edge/WAF and server-side limits by IP, device fingerprint/risk signal, destination, account and global provider budget.
- Add daily/hourly quotas, abuse alerts and provider spend caps.
- Add generic responses where account enumeration is possible and monitor unusual resend/verification patterns.
- Test concurrent issuance and resend behavior under load.

### F37-05 — MEDIUM: OTP hashes are unsalted SHA-256 rather than a purpose-built secret verifier

**Evidence**
- Customer auth `hashOTP` and technician auth `hashEmailOtp` compute plain SHA-256 over the six-digit OTP.
- OTP values are short numeric codes. The database stores the resulting hash and expiry/attempt fields.
- The code enforces a five-attempt cap and atomic increments, which reduces online guessing, but no per-row salt or keyed server-side HMAC is demonstrated.

**Risk**
A database disclosure permits efficient offline enumeration of the small six-digit OTP space. The attempt limit protects online verification but does not prevent offline cracking after a database compromise.

**Required remediation**
- Use a server-secret keyed HMAC (with key rotation/versioning) or a password-hashing approach appropriate to short OTP secrets.
- Keep the pepper outside the database and never log OTP values or hashes.
- Confirm OTP rows are inaccessible to anon/authenticated roles and retain minimal lifetime.
- Review secret rotation and incident response for compromised OTP-verification keys.

### F37-06 — MEDIUM: OTP and notification provider delivery is not independently verified in production

**Evidence**
- Customer and technician OTP functions send email through Resend using `RESEND_API_KEY` and `EMAIL_FROM`; missing credentials produce a 503 and registration/reset delivery is paused.
- Push delivery requires `FCM_SERVICE_ACCOUNT_JSON`; missing credentials return a 503 from the push function.
- The reviewed function set contains FCM push and Resend email code. No SMS or WhatsApp provider integration was found in the inspected functions.
- No live provider secret, sender/domain verification, webhook, delivery receipt or production configuration was inspected.

**Risk**
Repository code proves intended provider integration, not live delivery, sender reputation, verified domain, provider webhook handling or customer receipt. Marketing or UI claims of SMS/WhatsApp notifications would be unsupported by this code review unless another integration exists outside the inspected scope.

**Required remediation**
- Verify Resend sender/domain and FCM service account configuration in the production Supabase environment.
- Add provider delivery webhooks and persist accepted/delivered/bounced/failed states where supported.
- Test registration, password-reset and push delivery on real customer/technician devices.
- Do not claim SMS/WhatsApp delivery until a provider, consent, template, opt-out, retry and audit flow is implemented and verified.

### F37-07 — LOW/MEDIUM: Push payload data and deep-link metadata lack visible strict schema/size validation

**Evidence**
- `send-push-notification` accepts `data` as a string map and stringifies values before forwarding to FCM.
- It truncates title/body, but does not enforce a maximum number of data keys, key/value lengths, total payload size, or an allowlist of supported data fields.
- It constructs the web push link from `messageData.url` relative to `PUBLIC_APP_URL` (or a default public URL).
- `notification-ops` constructs standard dashboard destinations, but other callers to the internal push endpoint are trusted by service-role bearer.

**Risk**
A compromised or incorrectly implemented internal caller can pass oversized or unexpected metadata and produce unsafe deep-link behavior. Payloads may be rejected by FCM or direct users to unintended destinations.

**Required remediation**
- Define a strict data schema and allowlist notification types and route destinations.
- Enforce key/value count and byte-size budgets before calling FCM.
- Build deep links from server-owned route templates and validated identifiers, not arbitrary URLs.
- Add tests for malformed, oversized and hostile payload values.

## Positive controls observed

1. Notification tables are locked from direct anon/authenticated access by `20261005070000_lock_notification_tables.sql`; public CRUD policies are dropped and explicit deny policies are created.
2. The same migration removes notifications and technician_notifications from the Realtime publication.
3. Customer notification reads are scoped to the authenticated customer's mobile number; read updates also constrain recipient type and ID.
4. Technician notification reads and mark-read operations are scoped to the authenticated technician ID.
5. Admin notification operations require an unexpired admin session and active super_admin account in the inspected admin-data handler.
6. The push delivery endpoint requires an exact service-role bearer token.
7. FCM token registration derives owner identity from a valid customer/technician/admin session; unregister operations are owner-scoped.
8. Customer and technician OTPs are hashed, expire after ten minutes, and use a five-attempt atomic counter; the counter RPC is executable only by service_role.
9. OTP email delivery failures return 503 and clean up the newly created pending OTP rather than falsely reporting success.

## Verification not performed

- No live Supabase secrets or deployed function configuration inspected.
- No Resend account/domain or delivery webhook inspection.
- No Firebase/FCM project, service account or device delivery test.
- No SMS/WhatsApp provider account or live delivery test.
- No production database RLS/grant verification.
- No load, rate-limit, OTP concurrency, abuse, replay or provider outage tests.
- No client-side XSS/device-token exposure assessment.
- No Cloudflare deployment or GitHub Actions workflow was run.

## Required release gates

1. Restrict notification-ops to server-derived, allowlisted business events.
2. Implement durable notification outbox, per-channel delivery state, retries and reconciliation.
3. Stop returning raw FCM tokens to client code.
4. Add layered OTP issuance and verification abuse controls and keyed OTP hashing.
5. Verify Resend and FCM production configuration and real-device delivery.
6. Add strict push payload/deep-link schema validation.
7. Confirm no product claims of SMS/WhatsApp delivery until a verified provider workflow exists.

**Conclusion:** Audit 37 is complete as a repository-source review. Notification recipient scoping and OTP controls have meaningful foundations, but delivery-state correctness, generic notification authorization, token exposure and abuse controls remain release blockers. The marketplace remains **NOT PRODUCTION READY**.
