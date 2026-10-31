# Security Audit 24 — Booking OTP lifecycle, verification, leakage and abuse resistance

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Status:** Source audit only; no production calls, database writes, or deployment performed.

## Executive finding

The repository does **not** currently contain an active job-start/job-completion OTP verification flow. The legacy `booking-ops` actions `generate_otp` and `verify_otp` immediately return HTTP 410 (`Deprecated action`). The older code below those returns is unreachable but remains in the source.

The active technician workflow instead updates job statuses directly through `technician-data` after validating the technician session, active technician account, job ID, technician ownership, and allowed status transition. It does not require an OTP.

This is primarily a **workflow-integrity and product-claim mismatch**, not evidence that an active job OTP is currently returned to a caller. Do not represent the current workflow as OTP-verified.

## Findings

### 1. Legacy booking OTP endpoints are disabled

In `supabase/functions/booking-ops/index.ts`:
- `generate_otp` returns 410 before its old implementation.
- `verify_otp` returns 410 before its old implementation.
- `update_status` is also deprecated.

The unreachable legacy code is unsafe if ever reactivated:
- OTP generation uses `Math.random()` and a four-digit code.
- Verification loads a booking with `select("*")`.
- The old verification branch does not establish technician-session ownership or booking authorization before comparing the OTP.
- No expiry, attempt counter, resend throttling, or one-time atomic consumption is implemented in that old branch.
- The old generator returns the OTP in the HTTP response.

**Recommendation:** remove the unreachable legacy implementations in a dedicated cleanup, and keep the deprecated action names returning 410 until a complete server-side replacement is designed and tested.

### 2. Active technician status updates bypass OTP

In `supabase/functions/technician-data/index.ts`, action `job_status`:
- Authenticates the technician using `technician_auth_sessions`.
- Requires the technician account to be active.
- Loads the job by both `job_id` and authenticated `technician_id`.
- Enforces an allowed status-transition map and a compare-and-set update against the prior status.
- Allows transitions that mark work started/completed without checking an OTP.

The technician dashboard exposes “Start Job” and “Mark Completed” actions that call this status endpoint. Therefore, these are authenticated technician status assertions, not customer-confirmed OTP checkpoints.

**Risk:** a technician with a valid session can advance the job status without a customer-provided verification code. Whether this is acceptable is a product/business policy decision; it must not be described as OTP verification.

### 3. Public marketing claim is inaccurate

`src/components/home/Features.tsx` currently advertises “OTP Job Checkpoints” and says job start and completion use OTP verification. That statement does not match the active code path.

The feature copy has been changed in this branch to “Job Status Checkpoints” and describes status updates without claiming OTP verification.

### 4. Customer email OTP is a separate, stronger flow

`supabase/functions/customer-auth/index.ts` implements OTPs for customer registration and password reset, not booking job checkpoints:
- Uses `crypto.getRandomValues` for six-digit OTP generation.
- Stores a SHA-256 hash rather than the plaintext code.
- Uses a ten-minute expiry.
- Applies a 60-second resend cooldown.
- Enforces a five-attempt limit with an atomic database increment RPC.
- Marks a matching OTP consumed with a conditional update before completing the action.

The customer email OTP implementation must not be mistaken for booking start/completion verification.

### 5. Sensitive booking OTP exposure

- The deprecated booking OTP endpoints return 410 and do not return an OTP in the active response path.
- The older unreachable generator code would return the generated OTP if reactivated; remove it.
- Customer/admin response sanitizers on this branch strip `start_otp` and `complete_otp`.
- The technician dashboard data query selects explicit technician-job columns and does not select the booking OTP columns.
- This is source-level evidence only; runtime response capture and authorization tests remain outstanding.

## Required follow-up before claiming OTP protection

1. Decide whether job-start and job-completion require customer OTP confirmation.
2. If yes, design a dedicated server-side flow bound to booking ID, assigned technician, customer verification channel, purpose, expiry, retry budget, resend cooldown, and one-time atomic consumption.
3. Never return plaintext booking OTPs from an API or include them in broad booking/admin/customer payloads or logs.
4. Make status transitions depend on successful verification in the same atomic server-side operation; do not allow direct status bypasses.
5. Add tests for wrong booking, wrong technician, expired code, replay, five-plus attempts, concurrent verification, resend invalidation, unauthorized caller, and OTP non-leakage.
6. If OTP remains out of scope, keep UI and marketing language explicit that the workflow uses technician status updates rather than OTP confirmation.

## Release assessment

**Booking OTP lifecycle:** not implemented for job start/completion.  
**Legacy unsafe code:** unreachable due to 410 guards, but should be deleted.  
**Active status workflow:** authenticated and technician-scoped, but does not provide customer OTP assurance.  
**Production classification:** NOT PRODUCTION READY pending the broader KYC and sensitive-response blockers already recorded in PR #51, plus a documented decision and verification for the job-completion integrity model.

No Supabase migration was applied and no production deployment was performed.
