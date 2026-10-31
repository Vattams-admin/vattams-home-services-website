# Security Audit 54 — Customer Booking Access and Ownership

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Method: Read-only source review of customer-data and booking-ops. No live customer or booking data was accessed.

## Executive result

**NOT PRODUCTION READY. Existing guest-capability concern remains open; no duplicate finding is counted.**

The customer-data API resolves the customer ID from a valid, unexpired server-side session. Booking history, booking references, completed bookings and reviews are filtered by that resolved customer ID. Signed-in booking creation checks that the submitted mobile matches the mobile stored on the authenticated customer account and persists the server-resolved customer ID.

Guest booking creation is separate. Without a customer session, the booking row is created with customer_id null and the submitted guest mobile. The create response returns booking data including booking_action_token. Such guest rows are not included in the authenticated customer-history query because that query filters by customer_id.

## Current source observations

### Authenticated customer ownership

- customer-data resolves customer_id from customer_auth_sessions and rejects missing or expired sessions.
- Account booking history, bookings, booking_refs and completed_bookings are scoped to the resolved customer_id.
- Reviews are scoped to the same customer_id.
- The API does not take a caller-selected customer_id to retrieve another account's bookings.
- booking-ops validates the optional customer session, resolves the customer row and checks that the submitted booking mobile matches the stored mobile.
- The booking insert uses the server-resolved customer_id for authenticated customers.

### Guest booking flow

- When no customer session is provided, create_booking leaves customer_id null and stores the validated guest contact details.
- The inserted booking response includes the booking action capability field.
- auto_assign compares the submitted booking action capability with the value stored on the booking, or accepts a valid current super-admin session.
- The reviewed capability comparison does not visibly enforce an expiry timestamp or one-time consumption.
- Assignment still requires an eligible booking state and the final assignment uses assign_technician_job_atomic.

### Guest history continuity

- Authenticated customer booking-history queries filter by customer_id.
- Guest-created rows have customer_id null in the reviewed flow, so they do not appear in that account-history query.
- No separate guest booking claim or account-linking operation was established in the reviewed functions. This is a workflow verification gap, not an asserted exploit.

## Existing finding carried forward — Audit 31

The guest booking capability can authorize automatic assignment when it matches the booking's stored capability value. The reviewed path does not demonstrate expiry or one-time consumption. This is the same guest-capability concern already reported in Audit 31 and is not assigned a new finding ID here.

Recommended remediation:
1. Limit guest capabilities to narrow actions and add an explicit expiry.
2. Store a hash of the capability where feasible.
3. Rotate or consume the capability after its permitted operation and support revocation.
4. Separate guest read/tracking capability from assignment authorization.
5. If guest account claiming is supported, require verified control of the booking contact channel and prevent claims based only on booking ID or mobile number.
6. Test expired, replayed, mismatched and revoked capabilities and cross-customer booking reads.

## Positive controls

1. Customer identity comes from a server-side session.
2. Customer sessions are checked for expiry.
3. Booking reads and references are scoped to the authenticated customer ID.
4. Signed-in booking mobile must match the account mobile.
5. Authenticated booking ownership is set server-side.
6. Booking input and server-side pricing are validated.
7. Assignment requires a booking capability or a valid active super-admin session.
8. Final assignment uses an atomic RPC.
9. Legacy assignment and OTP actions return HTTP 410.

## Verification limits

No live session, guest capability, booking, account claim, cross-customer request or deployed endpoint was tested. No production database, RLS state or deployed function version was inspected. No SQL, migration, build, automated test, deployment, GitHub Actions run or merge was performed.

## Release gates

1. Close the Audit 31 guest-capability expiry, scope and replay gap.
2. Implement and test guest booking claim/history continuity if guest booking management is required.
3. Preserve server-derived ownership for authenticated bookings.
4. Add negative tests for cross-customer reads, replay, expiry and unauthorized guest claims.
5. Verify deployed Edge Function and database behavior before release.

**Conclusion:** Authenticated booking reads are scoped to the server-resolved customer ID and signed-in booking creation binds the mobile to the account. Guest bookings remain outside that account-history path, and the guest capability concern from Audit 31 remains open. No new distinct finding is counted in Audit 54. The marketplace remains NOT PRODUCTION READY.
