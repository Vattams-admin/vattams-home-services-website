# Security Audit 67 — Customer Notifications, Booking Alerts, Push Delivery and Notification Privacy

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration-history review  
**Release status:** **NOT PRODUCTION READY**

## Scope

Reviewed the notification gateway and push sender, customer and technician notification reads/acknowledgements, administrator notification actions, browser notification-click handler, notification table migration, and shared notification client:
- `supabase/functions/notification-ops/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/customer-data/index.ts`
- `supabase/functions/technician-data/index.ts`
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/booking-ops/index.ts`
- `src/lib/notifications.ts`
- `src/lib/customerData.ts`
- `public/firebase-messaging-sw.js`
- `supabase/migrations/20260728152558_20260728160000_create_notifications_system.sql`

## Executive result

**New findings: 2 (1 High, 1 Medium).** Positive controls exist: notification creation is routed through a service-role-backed gateway with customer, technician or active super-admin session checks; customer and technician read/acknowledgement paths filter by session-derived identity; the push sender requires the service-role bearer secret and queries active tokens by recipient identity. Realtime subscription is deliberately disabled for these custom-session identities.

Two material gaps remain in the reviewed source:
1. The historical notifications migration grants anon/authenticated unrestricted SELECT, INSERT, UPDATE and DELETE policies. This review did not establish that later migrations remove or supersede all four policies in the deployed database. If still effective, direct anon-key access bypasses the Edge Function authorization boundary.
2. Notification rows are inserted with `status: "sent"` before push delivery is attempted. Push failure is caught and returned separately, but the persisted row is not updated to `failed` or another delivery state. This makes the stored delivery status unreliable and can mislead support/operations.

## Finding F67-01 — Historical public notification CRUD policies can bypass recipient isolation

**Severity: High (conditional on deployed policy state)**

The notification migration enables RLS and creates policies allowing `anon` and `authenticated` to SELECT, INSERT, UPDATE and DELETE all rows using unconditional predicates. The migration comment explicitly describes this as the sessionStorage-based authentication pattern. In the reviewed customer and technician endpoints, server-side filtering is applied using session-derived identities, but those filters do not protect direct PostgREST access if the historical unrestricted policies remain effective.

**Impact if active:** A caller with the public anon key may be able to enumerate notification rows across customers, technicians and admins, forge notifications, change read/status/content fields, or delete records without passing `notification-ops` authorization. Notification content can contain booking and service information.

**Evidence:** `20260728152558_20260728160000_create_notifications_system.sql`, lines 32–44: RLS enabled, followed by unconditional public SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.

**Required remediation / verification:**
- Inspect the complete ordered migration history and deployed `pg_policies`, grants and table privileges for `public.notifications`.
- Remove direct anon/authenticated write policies; revoke table-level access not required by the client.
- Keep reads and mutations behind session-authenticated Edge Functions, or introduce narrowly scoped database policies that derive identity from a trusted database auth context.
- Test direct anon-key SELECT/INSERT/UPDATE/DELETE attempts against the deployed project with separate customer, technician and admin test identities.
- Do not treat this historical migration alone as proof the policies remain active; deployed-state verification is mandatory.

## Finding F67-02 — Notification persistence records "sent" before delivery is known

**Severity: Medium**

`notification-ops` inserts the notification row with `status: "sent"` before it dispatches the optional push request. If push delivery fails, the handler logs the failure and returns a `pushDelivery` error object, but does not update the persisted notification status. The initial row can therefore continue to say `sent` even when push failed. The gateway also stores requested channels, but the reviewed code only dispatches the push channel; selecting email or SMS does not show an email/SMS delivery implementation in this path.

**Impact:** Admin/support teams and customers may see a notification marked sent despite push delivery failure. Channel metadata can overstate what was actually delivered. This weakens incident diagnosis and any operational reporting based on notification status.

**Evidence:** `notification-ops/index.ts`, lines 50–52 insert `status:"sent"`; lines 54–88 perform best-effort push dispatch and capture response without updating the notification row. `src/lib/notifications.ts` accepts `email` and `sms` channel values, while the gateway path shown dispatches only push.

**Required remediation:**
- Define status semantics precisely: created/queued, provider-accepted, delivered (only if confirmed), failed and read.
- Persist initial state as queued; update it from provider outcomes, with checked database errors.
- Add an outbox/retry strategy and idempotency key so transient failures can be retried without duplicate notifications.
- Reject unsupported channels at the server boundary or implement and track their provider delivery separately.
- Do not equate FCM provider acceptance with device display or user receipt.

## Positive controls observed

### Gateway authorization
- `notification-ops` checks a valid, unexpired admin, technician or customer session.
- Admin creation requires the active `super_admin` role.
- Technician notifications are restricted to the session technician's own recipient ID.
- Customer notifications are restricted to the mobile number loaded from the session's customer record.
- Booking-action-token authorization is narrow in the visible code: it permits only a customer `booking_received` notification whose booking reference and recipient mobile match the token's booking.

### Read and acknowledgement isolation
- Customer account notification reads filter by `recipient_type="customer"` and the mobile number loaded from the authenticated customer record.
- Customer mark-read actions constrain notification ID, recipient type and session-derived mobile.
- Technician account reads filter by session-derived technician ID; technician mark-read paths constrain the recipient identity or technician-owned notification table.
- Admin notification operations constrain recipient type and the shared admin recipient key after admin authentication.
- Customer/technician client Realtime subscriptions are disabled because custom session authentication is not represented by Supabase Auth.

### Push sender
- `send-push-notification` requires an exact service-role bearer token.
- FCM tokens are queried only for the requested user type and active status, and normally scoped to the specified user ID.
- Invalid/unregistered FCM tokens are deactivated when the provider returns the recognized error codes.
- The booking notification dispatch helper uses an eight-second timeout and treats push as best-effort, avoiding indefinite blocking of the booking operation.

### Notification click destination
- `notification-ops` constructs a fixed role-specific dashboard destination rather than accepting a caller-provided arbitrary URL.
- The service worker resolves notification data URL relative to its own origin and only focuses/navigates an already-open client whose origin matches its own origin. A broader cross-origin navigation was not demonstrated in this handler.

## Carry-forward / verification notes

- The migration's public CRUD policies require final deployed-state verification as described in F67-01.
- The review does not establish that all notification producers use the gateway; booking creation has a separate direct service-role insert for the admin notification. Audit each producer and preserve the service-role boundary.
- FCM token registration, ownership binding, rotation and revocation were not fully established from the files reviewed in this pass. Verify the complete token-registration lifecycle and deployed `fcm_tokens` RLS/grants before release.
- Customer notification recipient identity is keyed by mobile number in the current design. Phone-number changes, number recycling and account identity continuity should be reviewed against notification history and token ownership.
- A push provider HTTP success indicates provider acceptance, not guaranteed delivery/display on a device.

## Verification limits

This is a source and migration-history review of the named branch. No production database policy/grant inspection, live PostgREST access attempt, FCM delivery, device receipt, token-registration test, queue/retry test, or end-to-end notification test was performed. No SQL, database mutation, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed.

## Release decision

**NOT PRODUCTION READY.** The public notification-table policy history must be reconciled with deployed RLS/grants, and persisted delivery status must reflect actual provider outcomes. Token lifecycle and producer coverage also require release verification.
