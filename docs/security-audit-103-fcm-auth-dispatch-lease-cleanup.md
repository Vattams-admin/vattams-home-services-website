# Investigation 330 — Release push dispatch claims on FCM authentication bootstrap failure

## Defect
The sender atomically reserved notification/device rows before calling Google OAuth to obtain an FCM access token. If JWT signing, OAuth token exchange, or credential bootstrap failed after claims were acquired, the outer handler returned HTTP 500 without clearing the sender dispatch leases. A direct send could therefore leave devices blocked until the 180-second dispatch lease expired.

## Fix
The sender now handles FCM access-token acquisition separately. When bootstrap fails before any FCM message request is made, it clears dispatch_lease_until for the exact notification and claimed device IDs, limited to pending/retryable rows. It returns HTTP 503 with perDeviceTracking=false so the retry worker uses its existing defer RPC and owns attempt counting/backoff. If the sender-side release update fails, the retry worker's defer path remains the fallback cleanup.

## Regression coverage
A source contract verifies ordering (atomic claims before OAuth, OAuth before sends), scoped lease release, retry-worker deferral signaling, and HTTP 503 behavior.

## Scope
Source and CI only. No production Supabase migration, data mutation, or Edge Function deployment is included.
