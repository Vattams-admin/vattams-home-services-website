# Investigation 324 — Retry Worker Partial Provider Failure Reporting

Date: 2026-11-05  
Repository: `Vattams-admin/vattams-home-services-website`  
Target branch: `main`

## Defect found

The `send-push-notification` Edge Function reports HTTP 200 when at least one device succeeds, even if other devices fail. Its response includes a per-device `failed` count. The retry worker previously inspected only `response.ok`, so a partial FCM failure was counted as sender-accepted and the worker returned HTTP 200. A scheduler or uptime monitor could therefore record a healthy run while one or more device deliveries had failed and were queued for retry.

## Source correction

- Validate and capture the sender response's non-negative integer `failed` count.
- Treat a missing or malformed per-device failure count as one reporting failure (fail closed).
- Aggregate provider failures across claimed delivery rows.
- Return HTTP 502 when provider failures or sender-level failures exist; keep HTTP 500 precedence for lease-deferral failures.
- Include `providerFailures` in the worker response for monitoring.

The database delivery ledger remains authoritative for per-device retry state. A non-2xx worker response is an operational alert signal; it does not overwrite the sender's recorded per-device outcome.

## Regression coverage

Added `scripts/notification-push-retry-worker-contract-check.mjs`, package command `test:notification-push-retry-worker`, and a Home Services Web CI step.

## Validation and production boundary

CI must pass before merge. No production Edge Function deployment, migration, scheduler, secret, Storage policy, or customer/technician/notification data was changed. Production retry rollout remains a separate gated step.
