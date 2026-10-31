# Security Audit 56 — Customer Booking Data Integrity, Contact/Address Changes and Post-Booking Modification Controls

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope and result

Reviewed customer-data, booking-ops, customer profile and booking UI, and customer API wrapper. Focus: ownership, contact/address mutation, profile-to-booking consistency, and post-booking changes.

One new low-to-medium API input-validation finding was identified. No customer-facing booking mutation path was found in the reviewed sources. The profile update is scoped to the authenticated customer ID, and booking creation stores booking-specific contact/address/schedule fields separately. No evidence was found that a profile edit rewrites existing bookings or that a customer can modify another customer's booking through these reviewed actions.

## Finding F56-01 — Customer profile API relies on browser-only field validation

**Severity:** LOW / MEDIUM  
**Category:** Server-side input validation and data integrity  
**Status:** Open — server-side validation and tests required

### Evidence

1. `src/pages/CustomerProfile.tsx` validates full name length (2–100), email syntax and maximum length (254), city length (100), and address length (500) before calling the API.
2. `supabase/functions/customer-data/index.ts`, action `profile`, constructs an update directly from `body.full_name`, `body.email`, `body.city` and `body.address`. The server action does not repeat the browser's length, type, trimming or email-format checks.
3. The profile update is correctly scoped with `.eq("id", customerId)`, where `customerId` comes from the authenticated customer session. This is a positive ownership control.
4. `src/lib/customerData.ts` sends the action and session token to the Edge Function; client-side validation cannot be treated as a security boundary because callers can invoke the endpoint without using the page form.

### Impact

A caller with a valid customer session can bypass the browser form and submit malformed or unexpectedly large profile values. Depending on database column constraints and downstream consumers, this can cause failed profile updates, inconsistent customer records, or unnecessary database/API load. The reviewed code does not demonstrate cross-customer modification or stored script execution; this finding is limited to missing server-side validation.

### Required remediation

- Validate that each supplied field has the expected type; trim strings and enforce the same server-side length limits as the UI.
- Validate email syntax server-side and define whether empty email is stored as null.
- Reject invalid payloads with a generic 400 response before issuing the database update.
- Add endpoint-level tests for missing, null, non-string, whitespace-only, overlong and malformed values, including direct API calls that bypass the UI.
- Consider a strict allowlist and explicit required-field policy for profile updates so omitted fields cannot accidentally become null or undefined.

## Positive controls observed

- Customer identity is resolved from an unexpired server-side customer session.
- Profile updates are filtered by the session-derived customer ID, not a caller-supplied customer ID.
- The profile UI keeps the registered mobile number read-only.
- Customer booking reads filter by the session-derived customer ID.
- Booking creation binds authenticated booking mobile number to the customer's account mobile number.
- Booking creation validates core contact/address/service fields and bounds several string lengths before insert.
- Booking-specific address, city, customer name and preferred schedule are stored on the booking row; the reviewed profile update does not update existing booking rows.
- The reviewed customer booking pages display booking details but expose no booking contact/address/date/time mutation action.
- No customer booking update action was found in customer-data or booking-ops; the legacy booking status update action is disabled.

## Design note — Profile versus booking snapshots

The source stores customer profile details and booking-specific service details separately. This audit does not assume that editing a profile should silently rewrite past or active bookings. If the intended product behavior is to update an active booking's service address/contact, it needs a separate authenticated operation with booking ownership checks, lifecycle restrictions, validation, technician notification and audit history. That is distinct from the cancellation/rescheduling gap recorded in Audit 55.

## Carry-forward items — not counted as new findings

- Customer cancellation/rescheduling workflow gap: Audit 55.
- Guest booking capability-token authorization and guest history continuity: Audits 31 and 54.
- Admin booking lifecycle bypass and cancellation/job lock-order risk: Audit 49.
- Refund/payment reversal gaps: Audit 35.
- No duplicate finding is counted for those issues here.

## Verification limits

This is a source-code review of the named branch only. No production Edge Function invocation, live database/RLS inspection, deployed schema verification, authenticated API test, build, automated test, migration, SQL, deployment, GitHub Actions run, or branch merge was performed. Database column constraints and deployed behavior were not independently verified.

**Release decision: NOT PRODUCTION READY.** Implement server-side profile validation and endpoint tests, then verify against the deployed environment before release.
