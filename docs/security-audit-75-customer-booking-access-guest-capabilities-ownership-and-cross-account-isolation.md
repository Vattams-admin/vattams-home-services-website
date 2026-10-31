# Security Audit 75 — Customer Booking Access, Guest Capabilities, Ownership Binding, Privacy and Cross-Account Isolation

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 0.** The reviewed customer-data API derives customer identity from a valid, unexpired server-side session and scopes booking, payment, review and profile access to that identity. Sensitive booking/payment capability tokens and OTP fields are removed from customer dashboard responses.

Guest booking creation is supported without a customer account; such bookings are stored with a null customer ID and a contact mobile number. The create response returns a booking action token. In the reviewed booking-ops handler, that token is used for the auto-assignment action; no guest booking-detail retrieval or guest cancellation/rescheduling action using it was identified. The token expiry, rotation and revocation policy was not established from the reviewed source.

## Scope and evidence reviewed

- `supabase/functions/customer-data/index.ts`
- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/booking-ops/index.ts`
- `src/lib/customerData.ts`

## Positive controls observed

### Customer identity comes from the server-side session

The customer-data `auth()` helper looks up `customer_auth_sessions` by the submitted session token, rejects missing or expired sessions, and returns the session's `customer_id`. Each customer-data action authenticates before processing.

### Booking reads are scoped to the authenticated customer ID

The `account`, `bookings`, `booking_refs` and `completed_bookings` actions filter booking queries using the server-derived customer ID. Profile updates are likewise filtered by that identity. The caller cannot select a different customer ID in these actions.

### Payment and review reads are identity-scoped

The payments action obtains the mobile number from the authenticated customer record and filters payment rows by both `payee_type = customer` and that mobile number. Review reads filter by customer ID. The submit-review flow verifies the session/customer match, the booking's customer ID and completed status before inserting a review.

### Sensitive capabilities are removed from dashboard payloads

The customer-data response sanitizer recursively removes `start_otp`, `complete_otp`, `booking_action_token` and `payment_action_token`. The customer booking column allow-list also omits these fields.

### Authenticated booking creation binds the account mobile number

The booking-ops create action validates a supplied customer session, resolves the customer's mobile number from the database, and rejects a booking contact number that does not match the verified account mobile. The persisted booking customer ID comes from the resolved session, not a client-supplied customer ID.

## Guest booking capability assessment

Unauthenticated booking creation remains possible. Without a customer session, the booking is inserted with `customer_id = null` and the normalized contact mobile number. The create response returns the booking ID, booking number and booking action token. The reviewed `auto_assign` action requires a matching booking action token or a valid active super-admin session.

No guest booking retrieval, cancellation or rescheduling action using this token was identified in the reviewed handler. The reviewed code does not establish token expiry, rotation, revocation or one-time consumption. Since the visible use is limited to triggering assignment and assignment is gated by booking state plus an atomic assignment RPC, token persistence alone is not counted as a confirmed exploit. Token lifecycle and intended guest self-service capability need explicit specification and verification.

## Carry-forward items — not counted as new

- Guest booking token expiry/one-time use and ownership binding were previously raised in Audit 54; confirm the current deployed schema and intended guest tracking design.
- Customer session revocation/logout confirmation were previously raised in Audit 57. The current customer-auth logout deletes the matching session row, but client-side logout and production revocation behavior still require verification.
- Password reset/change session invalidation and OTP throttling concerns remain tracked in Audit 31 and related authentication audits.
- Completion proof and admin lifecycle bypass remain tracked in Audits 49 and 64.

## Verification limits

This is a source-only review of the named branch. It does not prove the reviewed functions are deployed or that the live database has the same constraints and grants. No live cross-account tests, guest-token replay tests, session revocation tests, database inspection, SQL execution, migrations, builds, automated tests, deployment, GitHub Actions run or merge were performed.

## Release decision

**NOT PRODUCTION READY.** Preserve customer-ID-scoped access, formally define guest booking capability expiry/revocation and permitted operations, and verify live session revocation and guest isolation before release approval.
