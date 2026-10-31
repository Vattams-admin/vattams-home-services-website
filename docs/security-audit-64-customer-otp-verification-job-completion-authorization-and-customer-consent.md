# Security Audit 64 — Customer OTP Verification, Job Completion Authorization and Proof of Customer Consent

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/booking-ops/index.ts` — legacy booking OTP generation and verification actions.
- `supabase/functions/technician-data/index.ts` — technician job status transitions.
- `supabase/functions/admin-data/index.ts` — administrator booking status transitions.
- `supabase/functions/customer-auth/index.ts` — customer authentication OTP flow (not a booking/job OTP flow).
- `src/pages/CustomerBookings.tsx` and `src/pages/CustomerDashboard.tsx` — customer booking status presentation.
- `src/pages/TechnicianDashboard.tsx` — technician status controls.
- `src/lib/supabase.ts` — booking OTP/status fields.
- `supabase/migrations/20260803003901_20260803_ai_platform_upgrade.sql` — booking OTP status metadata.

## Executive result

**1 new finding: F64-01 (High).** The visible booking OTP actions in `booking-ops` are explicitly deprecated and return HTTP 410 for both OTP generation and verification. The current technician job-status endpoint accepts `job_completed` and `completed` status requests and calls the transition RPC without an OTP value or customer-consent artifact in the request. The admin booking-status action also permits direct status updates, including `completed`, without a visible OTP verification step in that handler. The SQL RPC definition was not available for verification, so any hidden database-side check remains unknown; the current application source does not demonstrate an end-to-end customer OTP consent workflow.

## Finding F64-01 — Booking start/completion OTP verification is not implemented in the active visible workflow

**Severity:** High  
**Status:** Open

### Evidence

1. In `booking-ops/index.ts`, the `generate_otp` action immediately returns HTTP 410 with `Deprecated action`.
2. In the same Edge Function, the `verify_otp` action immediately returns HTTP 410 with `Deprecated action`.
3. `technician-data/index.ts` allows `job_completed` and `completed` in its status allowlist and calls `transition_technician_job_atomic` with only:
   - `p_job_id`
   - `p_technician_id` (derived from the technician session)
   - `p_requested_status`
   No OTP or customer-consent proof is passed to this action.
4. `admin-data/index.ts` permits `completed` in its booking-status allowlist and updates the booking status directly for non-cancellation statuses. The reviewed handler does not require a completion OTP or customer confirmation.
5. The booking TypeScript interface still declares `start_otp`, `complete_otp`, `otp_verified_at`, `job_started_at`, `job_completed_at`, and `otp_verification_status`; the migration adds an `otp_verification_status` state constraint with `pending`, `start_verified`, `end_verified`, and `rejected`. These fields establish data-model intent, not a functioning active OTP verification workflow.
6. Customer booking pages describe `job_completed` as work reported complete and awaiting confirmation, but the reviewed customer booking screens do not provide a booking OTP verification action.

### Impact

A technician or administrator can request a completion state through the visible application endpoints without the request itself demonstrating customer possession of a booking-bound OTP or explicit customer consent. If the transition RPC independently checks a previously verified OTP state, that protection is not established by the RPC call signature or source reviewed here. The customer-facing workflow also lacks a visible confirmation action in the inspected pages. This creates a material risk of disputed or incorrectly recorded completion and weakens customer authorization evidence.

### Required remediation

1. Restore or implement a dedicated booking OTP lifecycle with separate start and completion purposes.
2. Generate high-entropy OTPs server-side, bind each code to one booking, the verified customer contact and one purpose, and store only a suitable keyed/slow hash rather than plaintext.
3. Deliver OTPs only to the verified customer contact associated with the booking; do not let a technician change the destination.
4. Enforce expiry, atomic attempt limits, resend throttling, one-time consumption and replay protection.
5. Add a customer-facing verification flow that authenticates the customer or securely proves control of the booking contact and clearly explains the action being authorized.
6. Make the completion transition RPC require a verified, unconsumed completion challenge for the same booking and current assigned technician; consume it atomically with the status transition.
7. Remove direct administrator status paths that bypass required customer consent, or require an explicitly authorized, reason-coded exception with a tamper-evident audit event.
8. Test wrong booking, wrong purpose, expired code, repeated code, excessive attempts, changed customer contact, reassignment races, concurrent verification and admin override.

## Positive controls and distinctions

- Customer account OTPs in `customer-auth` are for account registration/password recovery and are not evidence of booking completion consent.
- The technician job-status endpoint derives technician identity from the active technician session and passes that ID to the transition RPC.
- Customer booking screens distinguish `job_completed` (“awaiting completion confirmation”) from `completed`.
- These controls do not establish that a customer booking OTP is generated, verified, consumed or required before completion.
- The original `start_otp`/`complete_otp` fields and `otp_verification_status` metadata are not proof that the current production flow uses them.

## Carry-forward items — not recounted

- **Audit 31:** Customer OTP throttling and OTP hash-strength concerns in the account authentication flow. This audit's booking OTP issue is a distinct booking authorization lifecycle gap.
- **Audit 32 and Audit 62:** Technician status transition graph, stale assignment and atomic RPC behavior require SQL definition and deployed-state verification.
- **Audit 63:** Proof-of-work photos and customer signature evidence are not submitted through the reviewed technician dashboard/API path.

## Verification limits

This is a source-code and migration-history review of the named branch only. The SQL definition of `transition_technician_job_atomic`, deployed database triggers, production booking rows and live OTP delivery/verification behavior were not queried or tested. No real OTP was generated or sent. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. This report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** The active visible booking workflow does not demonstrate booking-bound OTP verification or customer consent enforcement before completion. The underlying transition RPC and deployed database state must be inspected and tested before this gap can be considered resolved.
