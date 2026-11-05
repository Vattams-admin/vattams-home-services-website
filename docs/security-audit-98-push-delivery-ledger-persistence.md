# Investigation 325 — Push Delivery Ledger Persistence Failure Handling

Date: 2026-11-05  
Repository: `Vattams-admin/vattams-home-services-website`  
Target branch: `main`

## Defect found

The `send-push-notification` Edge Function logged per-device delivery ledger lookup/update errors but still returned the provider delivery result as if tracking were healthy. If FCM accepted a message but the database failed to persist `status='succeeded'`, the row could remain leased and later be retried after lease expiry, creating duplicate push delivery. Monitoring also received no explicit tracking failure signal.

## Source correction

- Treat a failed or missing prior ledger row lookup as a tracking failure.
- Record failed per-device outcome updates as tracking failures rather than log-only events.
- Return HTTP 503 from the sender when delivery outcome persistence is incomplete, with a `trackingFailures` count.
- Aggregate `trackingFailures` in the retry worker and return HTTP 502 to scheduler monitoring for incomplete tracking.
- Preserve existing per-device provider outcome counts and lease-deferral error precedence.

The system cannot undo a provider-accepted push when its database acknowledgement fails. This change makes that uncertainty explicit and operationally visible; lease expiry may still cause a duplicate attempt in this exceptional failure mode.

## Regression coverage

Added `scripts/push-delivery-ledger-persistence-check.mjs`, npm command `test:push-delivery-ledger`, and a Home Services Web CI step.

## Production boundary

No production Edge Function deployment, migration, scheduler, secret, Storage policy, or customer/technician/notification data was changed. Deployment and controlled end-to-end verification remain required before production readiness can be certified.
