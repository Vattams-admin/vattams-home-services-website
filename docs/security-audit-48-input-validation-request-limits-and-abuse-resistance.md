# Security Audit 48 — Input Validation, Request Limits and Abuse Resistance

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Scope: Edge Function request parsing, body-size controls, field validation and length bounds, pagination, input coercion, and application-level abuse throttles.
Method: Read-only inspection of tracked Edge Function source. No production endpoint was called and no load or fuzz test was run.

## Executive result

**NOT PRODUCTION READY — source review only; request-limit behavior at the deployed edge remains unverified.**

The code has several useful controls: booking fields have explicit lengths, customer/technician OTP flows have per-mobile/purpose cooldowns and five-attempt caps, admin batch operations have update-count limits, and dashboard list queries often use fixed limits.

The review also found gaps where user-controlled text or metadata reaches database writes or downstream push delivery without a field-specific maximum, and no explicit application-level request-body byte limit appears in the reviewed handlers. These are source findings, not proof of an exploitable production denial-of-service condition. Login throttling and OTP cryptographic weaknesses are documented in earlier audits and are not counted again.

## Findings

### F48-01 — MEDIUM: Request handlers parse JSON without an explicit application-level body-size ceiling

**Evidence**
- supabase/functions/customer-auth/index.ts parses req.json() before dispatching actions.
- supabase/functions/technician-auth/index.ts parses req.json() before dispatching actions.
- supabase/functions/admin-auth/index.ts parses JSON directly in the login handler.
- supabase/functions/customer-data/index.ts, technician-data/index.ts and admin-data/index.ts parse request JSON without first checking Content-Length or enforcing a bounded streaming read.
- booking-ops checks that the parsed body is an object and validates selected booking field lengths, but it also calls req.json() before those checks.
- payment-auth, notification-ops and fcm-data similarly parse JSON directly. No shared request-size guard was identified in the reviewed function set.

**Risk**
A caller can submit an oversized JSON body to consume request parsing memory and CPU before action-level validation rejects or ignores excess fields. This is an application-level control gap. The actual maximum request accepted by Supabase Edge infrastructure and any platform-level protections were not inspected, so the audit does not claim unlimited body acceptance.

**Remediation**
- Add a shared bounded-body reader that rejects an excessive Content-Length early and enforces a byte ceiling while reading the stream; Content-Length alone is not sufficient.
- Set smaller per-function/per-action limits appropriate to expected payloads; registration and booking may need more than simple login or notification requests.
- Return 413 for oversized requests and 400 for malformed/non-object JSON.
- Add tests for absent, incorrect and oversized Content-Length, chunked bodies, malformed JSON and large nested objects.
- Confirm the deployed Supabase Edge gateway's own request limits independently.

### F48-02 — MEDIUM: Several customer and technician text inputs have no explicit field-length bounds before database writes

**Evidence**
- supabase/functions/customer-data/index.ts, support action: subject and message are trimmed and inserted into support_messages without a visible maximum length.
- customer-data profile action writes full_name, email, city and address from the request body without local type/length/format validation in this handler.
- supabase/functions/technician-data/index.ts, recharge action: payment_ref is converted to a string and trimmed, but no maximum length or allowed-character rule is applied before insertion into wallet_recharges.
- In contrast, booking-ops explicitly limits customer name, city, address and problem description (120/100/1000/2000 characters), and admin-data applies limits to several content and reminder fields. This demonstrates inconsistent validation rather than a universal absence.

**Risk**
Oversized or malformed values can be persisted, cause avoidable database/storage growth, degrade downstream display and moderation workflows, or trigger failures in consumers that assume bounded values. No production database constraint behavior was verified.

**Remediation**
- Define shared per-field schemas and enforce type, normalized length, allowed characters and format server-side before persistence.
- For support messages, set a defensible subject and message maximum and reject empty/oversized values.
- For profile fields, validate email format and bound name/city/address lengths; do not silently accept arbitrary object/array values through string coercion.
- For payment references, apply the exact expected payment-provider format and a strict maximum length.
- Add DB constraints as defense in depth only after reviewing existing data and obtaining separate authorization for schema changes.

### F48-03 — LOW/MEDIUM: Push notification metadata and reference fields lack a bounded schema

**Evidence**
- supabase/functions/notification-ops/index.ts caps title at 200 characters, message at 2,000 and type at 100, but reference_id is converted to a string without a visible length cap; channels accepts any array without an item-count or allowlist check.
- The same handler forwards referenceType, referenceId and type into downstream push data after string conversion.
- supabase/functions/send-push-notification/index.ts validates userType and non-empty userId/title/body, then truncates title/body for FCM, but does not enforce a maximum userId length or validate/bound the keys, count and total serialized size of the caller-provided data object before mapping all values to strings.
- fcm-data bounds FCM token to 4,096 characters and device_info to 200 characters; this positive control does not cover push payload metadata.

**Risk**
Authenticated callers or internal callers with access to these paths may persist oversized reference metadata or cause unnecessarily large downstream payloads and processing. The precise FCM provider limits and behavior for these payloads were not tested. Existing notification authorization weaknesses are a separate carryover from Audit 37.

**Remediation**
- Define an allowlisted notification type/channel schema and validate recipient type, reference type and reference ID format/ownership.
- Bound reference IDs and channel count; reject unknown channel names.
- For push data, allow only known keys, require scalar string values, cap each value and enforce a total serialized byte budget before calling FCM.
- Keep provider delivery errors bounded and avoid returning provider internals to clients.
- Add negative tests for nested objects, arrays, huge strings, unexpected keys and unsupported channels.

## Positive controls observed

1. customer-auth and technician-auth OTP flows apply 60-second per-mobile/purpose cooldown checks and a five-attempt OTP verification cap.
2. OTP attempt increments use the database RPC increment_otp_attempt_count rather than a client-side counter.
3. booking-ops explicitly validates booking body shape and bounds core booking text fields.
4. coupon-ops rejects malformed/non-object JSON and validates UUIDs, session token length and decimal discount values.
5. admin-data caps selected batch updates (technician/customer pricing and service price updates) and clamps list limits for AI drafts and CRM reminders.
6. customer-data and technician-data scope reads and writes to session-derived account identities.
7. fcm-data bounds FCM token and device-info fields.
8. send-push-notification validates user type, requires non-empty title/body and truncates displayed title/body sent to FCM.

## Existing findings deliberately not duplicated

- Missing login failed-attempt throttles for customer, technician and admin login were documented in Audits 31–33.
- OTP hash construction and broader OTP rate-limit weaknesses were documented in Audit 37.
- Notification event allowlisting and reference ownership are carried over from Audit 37 and Audit 47.
- Request/session ownership and admin privilege checks are covered in Audits 31–33 and 47.

## Production verification gaps

- No deployed gateway/body-size limits or Supabase function configuration were inspected.
- No runtime rate-limit, load, fuzz, concurrency or oversized-body tests were run.
- No provider-side FCM payload-limit behavior was tested.
- No production database constraints or existing data lengths were inspected.
- No code changes, SQL, migration, production data change, deployment, GitHub Actions run or merge was performed.

## Required release gates

1. Implement bounded request-body parsing consistently across public and privileged Edge Functions.
2. Add schema-based field limits for customer support/profile, technician payment references and notification metadata.
3. Add push payload allowlists and a total payload byte budget.
4. Test rate limits and abuse resistance at both application and deployed edge layers.
5. Re-run all role-specific authorization tests from Audit 47 after any shared middleware changes.

**Conclusion:** There are meaningful validation and throttling controls, but input limits are inconsistent and request-body bounds are not explicit in the reviewed handlers. Production edge behavior is unverified. The marketplace remains **NOT PRODUCTION READY**.
