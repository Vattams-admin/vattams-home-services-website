# Security Audit 87 — OTP Generation, Verification, Replay, Expiry, Concurrency and Delivery

**Repository:** Vattams-admin/vattams-home-services-website  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Review type:** Read-only OTP source review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**3 new findings:**
- **F87-01 — MEDIUM:** Six-digit OTPs are stored as unsalted SHA-256 digests. Because the OTP search space is small, a database disclosure permits practical offline enumeration of OTP values during their validity window.
- **F87-02 — MEDIUM:** OTP resend cooldown is implemented as a read-then-insert check rather than an atomic reservation. Concurrent requests can pass the same 60-second check and send multiple codes.
- **F87-03 — LOW:** OTP generation uses modulo reduction of a random 32-bit value to select one of 900,000 values, introducing a small distribution bias rather than using rejection sampling or a uniformly sampled range.

No live exploitation or database inspection was performed. Findings are based on inspected source only.

## Scope and evidence

Reviewed:
- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/technician-auth/index.ts`
- Related OTP handling, customer password recovery and technician registration paths.
- Previously recorded OTP/rate-limit findings in Audits 31, 37 and 79.

## Findings

### F87-01 — MEDIUM: Low-entropy OTPs use unsalted SHA-256

Both customer and technician handlers:
- Generate a six-digit decimal OTP.
- Hash it with SHA-256 over the OTP string.
- Store the resulting digest in `otp_codes.code`.
- Compare a newly computed SHA-256 digest with the stored value.

A six-digit decimal OTP has only one million possible values. An attacker who obtains the OTP table can cheaply enumerate the possible values and recover an unexpired OTP from its unsalted digest. The short expiry and attempt limit protect the online verification endpoint, but do not prevent offline guessing after data disclosure.

**Recommended remediation**
- Store a keyed HMAC of the OTP using a high-entropy server-held secret, with strict secret rotation and access controls.
- Bind the MAC input to purpose, account/mobile and OTP record identifier so a digest cannot be reused across contexts.
- Keep OTP values out of logs and error telemetry.
- Treat this as an additional protection layer, not a replacement for table access controls, expiry and attempt limits.

### F87-02 — MEDIUM: Resend cooldown is vulnerable to concurrent requests

Customer registration, customer password recovery/resend and technician registration use a pattern that:
1. Queries for an OTP created within the preceding 60 seconds.
2. Returns 429 if one exists.
3. Otherwise inserts a new OTP row and sends the email.

The check and insert are separate operations. There is no visible atomic per-mobile/purpose reservation, uniqueness constraint, transaction or lock around the cooldown decision in these handlers. Two concurrent requests can both observe no recent OTP and both proceed to create and deliver codes.

The same pattern can increase provider costs, confuse users with multiple codes and weaken the intended resend throttling. Audit 79 separately recorded the absence of layered IP/device/global/provider quotas; this finding is specifically the race in the per-identifier cooldown.

**Recommended remediation**
- Implement an atomic database-backed reservation keyed by normalized mobile and purpose.
- Enforce cooldown in the same transaction as reservation/OTP creation.
- Add layered IP, device, identifier and provider-level quotas.
- Ensure a failed email delivery releases or expires the reservation safely without allowing concurrent bypass.

### F87-03 — LOW: OTP generation has modulo-reduction bias

Both OTP generators obtain a cryptographically secure random 32-bit value and compute:

`100000 + (randomValue % 900000)`

Since 900,000 does not divide the full 32-bit range evenly, some six-digit values have a slightly higher probability than others. This is a small statistical bias, not evidence of predictable OTPs or a practical standalone bypass.

**Recommended remediation**
Use unbiased rejection sampling or a cryptographically secure integer-range API where supported by the deployed Deno runtime.

## Verification of existing OTP controls

### Customer OTP

- OTP purpose is restricted to `registration` or `forgot_password`.
- OTP expiry is set to ten minutes.
- Verification queries by mobile, purpose and `verified = false`.
- Expiry is checked before comparison.
- Incorrect attempts are incremented through `increment_otp_attempt_count`; the handler rejects at five attempts.
- Successful verification uses a conditional update from `verified = false` to `verified = true`, returning conflict if another request already consumed the pending state.
- Customer password reset deletes the verified OTP row conditionally before updating the password, preventing ordinary replay after successful consumption.
- Customer reset's verified-OTP age check is 30 minutes; the reset path checks `created_at` age rather than re-checking `expires_at`. This behavior should be made explicit and tested.
- Customer resend preserves the previous OTP until the new email provider request succeeds, then attempts cleanup of older rows.

### Technician registration OTP

- OTP purpose is `technician_registration`.
- Expiry is ten minutes.
- Verification selects the latest unverified row for the mobile and purpose.
- Incorrect attempts use the same atomic attempt-counter RPC and five-attempt threshold.
- Successful OTP comparison conditionally changes `verified` to true.
- Registration failure restores the OTP to unverified so the applicant can retry after a downstream failure; successful registration clears stored registration payloads.
- Resend creates a new OTP and, after provider acceptance, attempts to delete older unverified rows.
- The resend cooldown uses the selected pending row's `created_at`; like the customer path, this check is not an atomic reservation.

### Email delivery

- Customer and technician functions send OTP email through Resend.
- Missing `RESEND_API_KEY` or `EMAIL_FROM` causes delivery to fail closed for the OTP workflow.
- Provider rejection/failure is handled as an unsuccessful send; the newly inserted OTP row is deleted.
- Source inspection cannot establish actual provider configuration, delivery, inbox security, domain authentication (SPF/DKIM/DMARC), bounce handling or abuse quotas.

## Positive controls

1. OTPs are generated using the Web Crypto random API.
2. OTPs are not stored in plaintext in the reviewed table writes.
3. Ten-minute expiry is assigned to customer and technician OTP rows.
4. Five incorrect-attempt threshold is enforced in handlers with a database RPC for atomic counter increments.
5. Verification uses conditional state changes to reduce ordinary replay.
6. Email delivery failure prevents the workflow from reporting a successful send.
7. Superseded OTP cleanup is attempted only after successful provider acceptance, preserving the previous code if replacement delivery fails.

## Verification limits

- Source review only; no concurrent-request simulation, OTP brute-force test, replay test, provider delivery test or live endpoint probing.
- The migration/schema and deployed definition of `increment_otp_attempt_count` were not independently verified in the live database in this audit.
- No live RLS/grant, secret storage, email-domain authentication or provider quota configuration inspected.
- No database contents, OTP values, customer records or technician records accessed.
- No code changes, SQL, migrations, builds, tests, deployments, GitHub Actions execution or merges performed.
- Previously recorded findings are carried forward where relevant and not double-counted.

## Release decision

**NOT PRODUCTION READY.** Replace unsalted OTP digests with keyed, context-bound authentication codes; make resend cooldown reservation atomic; and use unbiased random-range generation. Then validate OTP expiry, concurrent verification, replay, provider delivery and layered abuse controls in a controlled test environment.
