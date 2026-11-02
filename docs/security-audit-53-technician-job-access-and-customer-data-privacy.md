# Security Audit 53 — Technician Job Access and Customer Data Privacy

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Method: Read-only source review of technician-data and admin-data Edge Functions. No production records or live endpoints were accessed.

## Executive result

**NOT PRODUCTION READY — prior privacy finding remains open; no new distinct finding is counted.**

The technician API derives the technician ID from a server-side session, checks the current account status, scopes job history to that technician ID, and delegates job-state changes to an atomic RPC using the authenticated technician ID. These are useful ownership controls.

The job-history response includes customer name, mobile, address and notes. The query has no lifecycle-based field minimization or historical time boundary. This is the same historical customer-data exposure already documented in Audit 32, so it is carried forward rather than counted again.

## Current source observations

### Technician identity and job ownership

- supabase/functions/technician-data/index.ts resolves the technician ID from technician_auth_sessions using the supplied session token and rejects missing or expired sessions.
- It loads the technician row using that ID and checks the current account status before protected actions.
- Non-active accounts receive a restricted account response; protected actions are rejected.
- The job-history query filters by the technician ID resolved from the session, not a caller-supplied technician ID.

### Job-history fields

- The account action queries technician_jobs by technician_id and orders by assigned_at descending.
- The selected fields include booking_id, technician_id, status, lifecycle timestamps, service_type, customer_name, customer_mobile, customer_address, scheduled date/time, notes, job_amount and call_rate_fee.
- The query does not limit history age or reduce customer contact/location fields for terminal jobs in the reviewed code.
- Customer contact and address fields therefore remain in the technician account response for historical rows, subject to the technician ownership filter.

### Job-state mutation

- The job_status action allowlists requested status values.
- It calls transition_technician_job_atomic with the job ID, authenticated technician ID and requested status.
- Error handling includes job-not-found, invalid-transition and booking-assignment-mismatch cases.
- This is a positive ownership control, subject to the deployed RPC implementation and database permissions, which were not tested.

### Admin data

- admin-data requires an unexpired admin session and checks the current active super_admin role.
- Its bookings and technicians actions use broad select-all queries. The response sanitizer removes selected capability tokens and converts KYC object paths to presence indicators, but does not provide complete field-level minimization for all personal data.
- This broad admin dashboard exposure is covered by prior audits and is not counted again.

## Existing finding carried forward — Audit 32

**Historical technician job responses retain customer phone/address data.** The current technician-data query confirms the same pattern and also includes customer_name and notes. This remains an open remediation item; Audit 53 does not assign a new finding ID or inflate the cumulative finding count.

Required remediation:
1. Define a minimum field set for each job lifecycle state.
2. Return customer phone/address only when operationally necessary for an active assigned job.
3. Mask or remove direct contact and precise address from terminal job history when the operational need ends.
4. Establish a documented retention and purge policy for historical job personal data.
5. Test that technicians cannot access another technician's jobs or unnecessary customer data from terminal jobs.
6. Review job notes for sensitive content and apply access and retention controls.

## Positive controls

1. Technician identity is derived from a server-side session record.
2. Job history is scoped to the authenticated technician ID.
3. Current technician status is checked before protected operations.
4. Job status inputs are allowlisted.
5. Job status changes use an atomic transition RPC with the authenticated technician ID.
6. Admin access checks an unexpired session and current active super_admin role.
7. Admin response sanitization removes selected bearer capabilities and private KYC object paths.

## Verification not performed

No live endpoint requests, cross-technician access attempts, deployed RPC inspection, production RLS verification, retention job inspection or data deletion test was performed. No build, automated test, SQL, migration, production database change, deployment, GitHub Actions run or merge was performed.

## Release gates

1. Resolve the historical customer personal-data exposure already identified in Audit 32.
2. Minimize contact/location fields by job lifecycle state.
3. Establish and enforce historical job-data retention and purge.
4. Add negative tests for cross-technician access and historical data minimization.
5. Independently verify deployed Edge Function and RPC behavior before production release.

**Conclusion:** Technician job access is scoped to the authenticated technician, and job-state mutations use an atomic ownership-aware RPC. Customer contact and address fields remain in job-history responses, matching an existing unresolved Audit 32 finding. No new distinct finding is counted in Audit 53. The marketplace remains NOT PRODUCTION READY.
