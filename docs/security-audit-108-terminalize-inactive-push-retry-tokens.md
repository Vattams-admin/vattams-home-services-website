# Investigation 335 — Terminalize inactive push-token retries

Date: 2026-11-06  
Repository: `Vattams-admin/vattams-home-services-website`  
Branch: `fix/terminalize-inactive-push-retry-tokens`

## Defect found

The retry worker claims a per-device delivery row and invokes `send-push-notification` with that token ID. The sender filters token records to `is_active = true`. If the token has since been deactivated or removed, the sender returns HTTP 200 with `{ success: true, sent: 0, failed: 0, total: 0, message: "No active tokens" }` before per-device tracking is initialized. The retry worker treated every response without `perDeviceTracking: true` as a dispatch failure and called `defer_notification_push_retry`. This caused a permanently unusable token to be retried through the exponential backoff until the retry limit, consuming scheduler work and polluting transient-failure counts.

## Fix implemented

- Detect the sender's explicit successful `No active tokens` response.
- Call a narrowly scoped service-role RPC to mark that delivery `terminal` with `FCM_TOKEN_INACTIVE_OR_MISSING`.
- Clear both worker and sender dispatch leases when terminalizing.
- If terminalization fails, surface a failure so the worker run is not reported as clean.
- Add a regression contract and migration privilege assertions.

## Files

- `supabase/functions/notification-push-retry/index.ts`
- `supabase/migrations/20261107010000_terminalize_inactive_push_retry_tokens.sql`
- `scripts/inactive-push-retry-terminalization-check.mjs`
- `package.json`

## Deployment boundary

Source and migration are not production deployed by this change. Cloudflare Pages deploys the website; this retry worker and SQL migration are Supabase backend artifacts and require their own authorized Supabase rollout. No production database or Edge Function was modified.
