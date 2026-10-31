# Security Audit 68 — FCM Token Registration, Ownership, Device Revocation and Account-Switch Privacy

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration-history review  
**Release status:** **NOT PRODUCTION READY**

## Scope
Reviewed:
- `supabase/functions/fcm-data/index.ts`
- `src/lib/fcm.ts`
- `src/components/PushNotificationSetup.tsx`
- Customer, technician and admin login call sites
- Technician dashboard logout implementation
- `supabase/migrations/20260803003901_20260803_ai_platform_upgrade.sql`
- `supabase/migrations/20261006120000_lock_fcm_public_access.sql`
- `supabase/migrations/20261010094000_close_public_table_access.sql`
- Push sender token lookup in `supabase/functions/send-push-notification/index.ts`

## Executive result
**New findings: 2 (1 High, 1 Medium).** FCM registration is routed through a server-side function that authenticates the current session and derives the owner ID from that session. Public direct table access is explicitly revoked in later migrations. Registration is idempotent on the tuple `user_type,user_id,token`, and the server supports per-token and per-user deactivation.

However, the reviewed logout path does not consistently revoke server-side FCM token associations. The technician dashboard logout clears browser session keys without calling FCM unregister; customer logout implementation also needs end-to-end confirmation against the FCM unregister helper. In addition, the shared browser FCM token is not partitioned by application account: registering the same browser token for a second account creates another owner association, while deleting the Firebase token locally does not itself guarantee server-side cleanup for the previous owner. This can leave stale notification routing to an account that no longer owns the active browser session.

## Finding F68-01 — Logout does not consistently revoke FCM ownership associations

**Severity: High**

The FCM data function provides authenticated `unregister` and `unregister_user` actions, but the reviewed technician dashboard logout removes technician session keys and navigates to login without invoking `unregisterUserFCM`. The FCM helper attempts local `deleteToken(messaging)` and then server-side user deactivation, but the helper is not called by that logout path. Local deletion alone cannot be relied on to deactivate the previously stored `fcm_tokens` row.

The customer authentication logout endpoint deletes the customer auth session and returns success; it does not deactivate that customer's FCM rows. The client-side logout call site must be considered alongside this server behavior. Admin logout integration was not fully established in this pass.

**Impact:** An old device token may remain active and continue receiving push messages for a signed-out account until token invalidation or other cleanup. On shared devices, account changes can create cross-account notification privacy exposure.

**Remediation:**
- Invoke server-side `unregister_user` before clearing the current role's session credentials; do not make successful local Firebase token deletion the only revocation mechanism.
- Prefer a server-side logout operation that atomically revokes the auth session and deactivates the account's device token associations.
- If network failure prevents immediate revocation, persist a retryable revocation intent and ensure stale tokens are not used for sensitive notifications.
- Verify customer, technician and admin logout paths independently.

## Finding F68-02 — Shared browser token can be associated with multiple account identities

**Severity: Medium**

The registration table's unique key is `(user_type,user_id,token)`, so the same FCM token may have multiple active rows for different account IDs. The registration endpoint upserts by this three-column key and does not deactivate the same token under a prior owner. The browser helper calls Firebase `getToken` and registers the resulting token for the current user; it does not first transfer or remove prior ownership associations.

The push sender queries all active rows for a given recipient. Therefore, after account switching on a shared browser/device, a token can remain associated with the former account and the new account until explicit unregister or provider invalidation.

**Impact:** Notifications for the former account may continue to be sent to a device now used by another account. This is especially sensitive on shared household or technician devices.

**Remediation:**
- Define explicit device ownership semantics. If one browser profile should have one active account association per role, enforce it atomically at registration by deactivating prior owner associations for that token before inserting the new owner.
- If multi-account-per-device is an intentional feature, require explicit account-switch confirmation and provide per-account notification controls.
- Add tests for customer A logout followed by customer B login on the same browser; technician/customer role changes; repeated login; and multiple tabs.
- Do not expose raw FCM tokens in ordinary client-facing UI or logs.

## Positive controls observed

- `fcm-data` validates a live session token and expiry for the selected role.
- Customer owner ID is resolved from the authenticated customer session and customer record; a caller-supplied mobile is not authoritative.
- Technician owner ID is derived from the technician session, and a mismatching requested user ID is rejected.
- Admin owner ID is derived from the admin session and checked against the supplied admin ID; active status is checked.
- Registration bounds token length to 4,096 characters and device information to 200 characters.
- Registration uses upsert on `user_type,user_id,token`; repeated registration for the same account/token is idempotent.
- Per-token unregister is scoped to the authenticated owner, and unregister_user rejects a different requested user ID.
- Listing returns active tokens only and is scoped to the session-derived owner.
- The 2026-10-06 migration replaces public token-table policies with deny policies; the 2026-10-10 migration drops the legacy public policy and revokes table privileges from PUBLIC, anon and authenticated.
- Push sender requires the exact service-role bearer secret and filters by recipient type and active state, then by user ID except for the intentional shared admin recipient key.

## Carry-forward / verification notes

- The FCM helper's `unregisterFCMToken` loops over locally available role sessions and returns success after a successful request, but logout integration was not demonstrated for all role surfaces.
- `unregisterUserFCM` catches and logs server revocation errors without surfacing a result to callers; a caller could continue logout without knowing that server cleanup failed.
- Customer logout session deletion does not check the database delete error before returning success; this is an existing session-revocation concern (Audit 57) and is not counted as a new FCM finding here.
- The reviewed admin FCM authorization checks active admin status but does not require `role === "super_admin"` in the visible `fcm-data` helper. Whether a narrower admin role model exists elsewhere is not established. Confirm intended admin role policy before permitting admin device registration.
- Production RLS/grants and actual token records were not queried. The migration source is positive evidence of intended hardening, not proof that all migrations have been applied to production.
- The FCM token is a bearer-like device delivery address. Avoid exposing it through logs, support exports or analytics.

## Verification limits
Source and migration-history review only. No production token rows, RLS/grants, device registrations, account-switch scenario, Firebase deletion, push delivery, logout flow, or live browser session was tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed.

## Release decision
**NOT PRODUCTION READY.** Server-side token ownership checks and table-access hardening are positive, but logout revocation and same-device account-switch cleanup must be completed and verified before release.
