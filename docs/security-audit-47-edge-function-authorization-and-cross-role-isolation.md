# Security Audit 47 — Edge Function Authorization and Cross-Role Isolation

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Scope: Service-role-backed Edge Function authentication, session-to-account binding, role revalidation, cross-role object ownership, and privileged downstream function access.
Method: Read-only review of tracked Edge Function source. No requests were sent to production endpoints and no secrets were accessed.

## Executive result

**NOT PRODUCTION READY — runtime authorization has not been independently tested.**

The reviewed functions generally use custom server-side session records and derive customer/technician identities from those records rather than trusting caller-supplied IDs. Admin-data and notification-ops explicitly re-check the active super_admin role. The push-delivery endpoint requires the exact service-role bearer token.

One concrete inconsistency remains: fcm-data checks that an admin session belongs to the supplied admin ID and that the account is active, but it does not check the admin's current role. A still-valid session for an account whose role has been downgraded can continue using admin FCM token operations.

Earlier audit findings around broad notification self-submission, payment registration ownership, raw bearer tokens, broad admin payloads and notification delivery state are not repeated here; see Audits 29, 32, 33 and 37.

## Findings

### F47-01 — MEDIUM: FCM admin authorization omits current super_admin role verification

**Evidence**
- supabase/functions/fcm-data/index.ts, authorize(): for userType admin, it loads admin_auth_sessions by the supplied session token and checks that session.admin_id matches the supplied admin_id.
- It then loads admin_users and checks only that the account is active. It does not require role === super_admin.
- The same endpoint's admin authorization permits register, unregister, unregister_user and list actions after this check. The list action returns active FCM device tokens for the resolved admin owner.
- By contrast, supabase/functions/admin-data/index.ts checks both role === super_admin and is_active === true; notification-ops and payment-auth also explicitly check the current super_admin role before admin operations.
- The FCM endpoint therefore has a weaker role check than the other reviewed admin-facing Edge Functions.

**Risk**
If an admin account is downgraded from super_admin while an existing admin_auth_sessions row remains unexpired, the FCM endpoint continues to authorize that session based on active status alone. The downgraded account may list, register or deactivate its own admin push tokens until session expiry or deletion. This is a privilege-revalidation inconsistency and exposes device-token management to a role that may no longer be authorized.

**Remediation**
- Require role === super_admin and is_active === true in fcm-data before every admin action.
- Prefer a shared server-side admin authorization helper used consistently by all admin-capable Edge Functions.
- Revoke all outstanding admin sessions on role downgrade, account suspension or other privilege change.
- Add regression tests: super_admin succeeds; active non-super_admin with an old session is denied; inactive admin is denied; mismatched admin ID is denied.

## Positive controls observed

1. admin-data validates the session token, binds it to the supplied admin ID, checks expiry, and rechecks active super_admin status.
2. notification-ops independently checks admin session ownership, expiry and active super_admin role.
3. payment-auth's verify action checks session ownership/expiry and current active super_admin role.
4. booking-ops auto_assign supports a booking capability or a validated active super_admin session; it does not accept an arbitrary admin ID alone.
5. customer-data derives the customer ID from customer_auth_sessions and scopes booking, profile, review and notification operations to that ID.
6. technician-data derives the technician ID from technician_auth_sessions and uses that ID in all protected job, wallet and notification queries; job transitions pass the session-derived ID to the atomic RPC.
7. coupon-ops derives customer identity from the customer session and compares it with the booking's stored customer_id before redemption.
8. fcm-data derives customer mobile from the authenticated customer session and rejects a different requested recipient; technician token operations are scoped to the session's technician ID.
9. send-push-notification rejects requests unless the Authorization header exactly matches the configured service-role key, and restricts userType to customer, technician or admin.
10. The service-role key is read from Edge Function environment secrets in the reviewed server code; no hard-coded service-role key was identified in the reviewed files.

## Cross-audit carryovers (not counted as new findings)

- notification-ops permits an authenticated customer/technician to create arbitrary notification content and reference metadata for their own recipient identity. This is the notification self-submission issue already documented in Audit 37; it needs an allowlisted event schema and reference ownership checks.
- Payment creation/UTR submission ownership limitations are documented in Audit 29 and Audit 34.
- Broad admin reads and sensitive-field sanitizer limitations are documented in Audits 33 and 40.
- Session revocation and raw bearer token storage limitations are documented in Audits 31–33 and 38.
- send-push-notification uses a service-role bearer as an internal privileged boundary. Its production endpoint exposure, secret rotation, function-level JWT configuration and negative access behavior were not tested in this source-only audit.

## Production verification gaps

- No live Edge Function requests, negative authorization probes or role-downgrade tests were performed.
- No Supabase function deployment configuration or deployed function versions were inspected.
- No production role changes, session revocation behavior, service-role secret configuration or FCM token ownership was verified.
- No runtime rate-limit, body-size, concurrency or abuse tests were performed.
- No SQL, migration, production data change, deployment, GitHub Actions run or merge was performed.

## Required release gates

1. Add the missing current-role check to fcm-data and centralize admin authorization logic.
2. Verify role downgrade/suspension invalidates all privileged sessions or is rechecked on every privileged request.
3. Add automated cross-role negative tests for customer, technician and admin Edge Function actions.
4. Add notification event/type/reference allowlists and ownership validation (Audit 37 carryover).
5. Verify deployed function versions, function-level JWT settings, CORS behavior and secret handling in production.

**Conclusion:** The service-role boundary and most session-to-owner checks are present in the reviewed source, but fcm-data has an admin role-revalidation gap. Production runtime behavior remains unverified. The marketplace remains **NOT PRODUCTION READY**.
