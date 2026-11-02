# Security Audit 39 — API Security, CORS, Request Validation, Rate Limits and Secrets

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Supabase Edge Function request boundaries, CORS, HTTP methods, payload parsing/size, validation, abuse throttling, authorization, secrets and outbound request construction.  
**Method:** Read-only inspection of ten Edge Function source files. Cloudflare WAF/rate-limit rules, Supabase gateway configuration, production secrets and live deployments were not inspected.

## Executive result

**Release status: NOT PRODUCTION READY.**

The reviewed functions use server-side custom-session checks for customer, technician and admin actions, and the internal push endpoint requires the service-role bearer. Booking creation has useful field-length, date, pricing and service validation. However, all reviewed browser-facing functions use wildcard CORS; the handlers do not demonstrate general request-body size limits or broad IP/device/global rate limits; JSON parsing is generally performed without a bounded streaming read; and some request inputs are only lightly validated before database or provider operations. Infrastructure-level controls may exist, but were not available for this repository-only review.

## Findings

### F39-01 — MEDIUM: Wildcard CORS is used across sensitive browser-facing Edge Functions

**Evidence**
- The inspected `booking-ops`, `customer-auth`, `technician-auth`, `admin-auth`, `customer-data`, `technician-data`, `admin-data`, `notification-ops` and `fcm-data` functions set `Access-Control-Allow-Origin: *`.
- The reviewed handlers also allow broad method/header declarations in their CORS headers, although some endpoints subsequently enforce POST.
- Custom session tokens are generally supplied in JSON request bodies rather than browser cookies; the CORS headers do not enable credentialed cookie access.

**Risk**
Wildcard CORS does not by itself grant access or bypass server-side session validation. It does, however, allow any website to make cross-origin browser requests to the API and read responses when the caller possesses the required session token. This increases the impact of token theft through XSS, malicious extensions or compromised client contexts and makes origin-based defence unavailable.

**Required remediation**
- Use an explicit production origin allowlist for browser-facing functions, including approved staging origins where needed.
- Validate the incoming Origin against the allowlist and return the matched origin, not a wildcard.
- Keep non-browser/internal functions private or service-role-only and avoid exposing them as general browser endpoints.
- Retain server-side authorization as the primary security boundary; CORS is not authentication.
- Test approved, unapproved, missing and null Origin behavior.

### F39-02 — HIGH: No general request-body size limit or bounded JSON parser is demonstrated

**Evidence**
- The inspected handlers call `req.json()` directly, including customer-auth, technician-auth, customer-data, technician-data, admin-data, notification-ops and fcm-data.
- No common bounded body-reading helper or explicit Content-Length/body-stream cap was found in the inspected source.
- Individual fields are sometimes truncated or validated after parsing (for example booking name/address/problem description, notification title/message, device info and push title/body), but this does not limit the raw request body or nested object size before parsing.

**Risk**
A caller can send oversized JSON, deeply nested objects or very large arrays/strings that consume memory and CPU before field-level validation. This can cause Edge Function resource exhaustion, noisy logs or elevated platform cost. Per-field truncation after parsing does not protect the parser.

**Required remediation**
- Enforce request-body byte limits at the gateway/WAF and again in a shared Edge Function parser.
- Reject unsupported content types and malformed/oversized payloads with controlled 400/413 responses.
- Bound array lengths, object key counts, nesting depth and string sizes.
- Add tests for oversized, deeply nested, malformed and compressed payloads.
- Ensure Cloudflare/Supabase gateway limits are documented and verified in production.

### F39-03 — HIGH: General API abuse throttling is not demonstrated outside narrow OTP cooldowns

**Evidence**
- The inspected handlers do not show a shared IP/device/account rate-limit middleware or distributed request budget.
- Customer and technician OTP flows include a 60-second per-mobile/purpose resend cooldown and five-attempt OTP verification cap.
- Booking creation, support submission, login, password reset, FCM token registration, notification creation and admin operations have no general handler-level rate-limit mechanism visible in the reviewed source.
- No Cloudflare rate-limit/WAF configuration was inspected.

**Risk**
Attackers can automate login guessing, account enumeration, booking spam, support spam, notification abuse, token-registration churn and expensive admin/provider requests. OTP per-mobile cooldowns do not prevent distributed abuse across many destination accounts or IPs.

**Required remediation**
- Apply layered limits by IP, account, device/risk signal, route and global budget at both edge and application layers.
- Use stronger controls for login, OTP issuance/verification, booking creation, support, push registration and high-cost operations.
- Add progressive delays, anomaly detection, alerting and provider spend caps where appropriate.
- Ensure limits are distributed/atomic across Edge Function instances and cannot be bypassed by changing headers or client IDs.
- Load-test burst, distributed and concurrent abuse scenarios.

### F39-04 — MEDIUM: Request validation is inconsistent across functions and action schemas

**Evidence**
- Booking creation performs substantial validation for customer identity, mobile format, selected service, date/time, configured prices, coupon rules and field lengths.
- Other handlers often parse arbitrary JSON and dispatch by a string action without a shared schema.
- `notification-ops` validates required notification fields and truncates selected strings, but accepts arbitrary caller-supplied channel arrays and reference metadata.
- `fcm-data` validates token non-empty/maximum length and device info length, but does not demonstrate a strict FCM token format or device-count cap.
- `customer-data` support submission trims subject/message but does not enforce maximum lengths or non-empty content at the handler.
- `technician-data` recharge validates amount range, but accepts payment_ref as a trimmed string without a visible maximum length.
- `admin-data` has several well-bounded actions, but validation varies by action.

**Risk**
Inconsistent validation can permit malformed values, oversized fields, unsupported enum values, unexpected nested properties or abuse of less-protected actions. TypeScript interfaces do not validate untrusted runtime JSON.

**Required remediation**
- Define strict runtime schemas for every action and reject unknown properties where practical.
- Validate types, formats, lengths, enum values, IDs, array counts and cross-field invariants before database operations.
- Centralize reusable validation and error handling without weakening action-specific authorization.
- Add negative tests for nulls, arrays in place of objects, numeric strings, oversized values, unknown actions and malformed identifiers.

### F39-05 — MEDIUM: Admin authentication and other credential-sensitive endpoints lack demonstrated general throttling

**Evidence**
- `admin-auth` verifies email/password and creates an eight-hour server-side session; no failed-login counter, progressive delay or lockout is visible in the inspected handler.
- `customer-auth` and `technician-auth` login handlers similarly do not show general failed-password attempt throttling in the inspected source.
- OTP endpoints have their separate cooldown/attempt controls, but those do not protect password-login routes.
- The repository-only review did not inspect upstream Cloudflare or Supabase Auth gateway controls.

**Risk**
Credential stuffing and password guessing can target admin, technician and customer accounts. Admin compromise has especially high impact because the reviewed admin-data API exposes sensitive records and privileged operations.

**Required remediation**
- Add account/IP/device-based login throttling and risk-based challenges, with alerts for admin login anomalies.
- Avoid permanent lockout designs that enable denial of service; use progressive delays and secure recovery.
- Add MFA/step-up authentication for privileged admin and sensitive financial/KYC operations.
- Test credential stuffing and distributed password guessing against production-like controls.

### F39-06 — MEDIUM: Internal service-role trust is based on a static bearer secret without demonstrated network isolation or rotation procedure

**Evidence**
- `send-push-notification` requires the exact `SUPABASE_SERVICE_ROLE_KEY` bearer.
- `notification-ops` and `booking-ops` call the push function using that service-role key.
- Other Edge Functions instantiate Supabase clients using the service-role secret from environment variables.
- The reviewed source does not demonstrate a separate narrowly scoped internal service credential, key rotation workflow, network-level restriction or audit of internal caller identity.

**Risk**
The service-role key bypasses RLS. If exposed through logs, browser bundles, error messages or a compromised function, it can grant broad database access. Reusing the same high-privilege key for internal function-to-function calls expands the impact of a single secret compromise.

**Required remediation**
- Keep service-role keys exclusively in server-side secrets; add automated scans preventing them in client assets, logs and repository history.
- Use a dedicated internal authentication mechanism with narrow audience/scope where supported, rather than distributing the database super-credential between services.
- Document rotation, revocation, incident response and secret access auditing.
- Validate that no service-role secret is returned in API responses or exposed to browser code.
- Review deployed function secret access and permissions.

### F39-07 — LOW/MEDIUM: Outbound URL and provider request boundaries need a shared allowlist and timeout policy

**Evidence**
- The reviewed code makes outbound calls to Resend, Google OAuth/FCM and the Supabase function endpoint.
- Booking and notification flows construct public app links using configured `PUBLIC_APP_URL`; booking-ops includes validation for the configured origin.
- The push endpoint builds an FCM deep link using `messageData.url` relative to `PUBLIC_APP_URL` or a default base.
- The inspected outbound fetch calls do not consistently demonstrate explicit timeouts, retry budgets or a shared destination allowlist.

**Risk**
Unexpected configuration or caller-controlled metadata can produce unsafe or unintended deep links. Slow provider/network responses can occupy Edge Function execution time, and unbounded retries can amplify outages and provider cost. No SSRF vulnerability is asserted from these fixed provider calls; the concern is configuration and outbound-call hardening.

**Required remediation**
- Restrict outbound destinations to explicit provider hosts and approved application origins.
- Build deep links from server-owned route templates and validated identifiers.
- Apply per-request timeouts, bounded retries with jitter and circuit-breaker behavior.
- Redact provider response bodies and secrets from logs.
- Test provider outage, slow response, malformed configuration and redirect behavior.

## Positive controls observed

1. Sensitive customer, technician and admin data handlers validate server-side custom sessions before performing protected actions.
2. Admin data requires an unexpired session plus active `super_admin` status.
3. The internal push function requires a service-role bearer and rejects non-POST methods.
4. Booking creation has substantive validation for identity fields, service availability, date/time, pricing, coupons and field lengths.
5. Customer and technician OTP verification has a five-attempt limit and atomic attempt counter; OTP resend has a 60-second per-mobile/purpose cooldown.
6. FCM token registration derives owner identity from a verified session and bounds token/device-info input lengths.
7. Several admin actions explicitly bound numeric ranges, array sizes, string lengths and accepted status values.
8. The inspected functions use environment variables for Supabase and provider credentials rather than hardcoding provider secrets in the reviewed source.

## Verification not performed

- No Cloudflare WAF, rate-limit, bot-management or origin configuration inspection.
- No Supabase Edge gateway limits, deployed function configuration or production secrets inspection.
- No penetration test, load test, fuzzing, malformed JSON or request-body exhaustion test.
- No CORS browser integration test.
- No service-role key exposure scan of built client bundles or complete Git history.
- No secret rotation or incident-response exercise.
- No production API/provider availability or outbound network test.
- No deployment or GitHub Actions workflow was run.

## Required release gates

1. Replace wildcard CORS with an explicit origin policy for browser-facing functions.
2. Enforce body-size, content-type and bounded JSON parsing limits.
3. Deploy layered distributed rate limits for authentication, OTP, booking, support, notifications and expensive operations.
4. Add strict runtime schemas for every action and input object.
5. Harden admin login with MFA/step-up and abuse detection.
6. Reduce service-role key exposure and document rotation/revocation.
7. Apply outbound host allowlists, timeouts, bounded retries and safe deep-link construction.
8. Independently verify Cloudflare and Supabase gateway protections in production.

**Conclusion:** Audit 39 is complete as a repository-source review. Authentication and some input-validation controls are present, but request-size limits, general abuse throttling, strict origin policy and consistent runtime schemas are not demonstrated. The marketplace remains **NOT PRODUCTION READY**.
