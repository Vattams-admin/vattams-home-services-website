# Investigation 337 — Fence stale notification retry workers

Date: 2026-11-06  
Repository: `Vattams-admin/vattams-home-services-website`  
Branch: `fix/fence-stale-push-retry-workers`

## Defect confirmed

The retry claim RPC returned only a delivery ID and the worker later called `defer_notification_push_retry(uuid)` or `terminalize_notification_push_retry(uuid)`. Both SQL functions checked only that the row was pending/retryable and had a non-null lease. They did not check that the lease was still valid or belonged to the caller's claim.

A worker could pause beyond its 120-second lease. A second worker could then reclaim the row and set a new lease. If the first worker later received a network failure or an inactive-token response, its stale defer/terminalize RPC could update the second worker's row, clear its lease and overwrite its status.

## Fix implemented

- The claim RPC now returns the exact `lease_until` timestamp issued to that worker.
- Retry worker passes that timestamp to defer and terminalize RPCs.
- Both mutation RPCs require exact lease equality and `lease_until > now()`.
- The RPCs return a boolean indicating whether the caller still owned a live claim.
- Removed the old unfenced one-argument mutation RPC signatures and granted execution only to `service_role` for the new signatures.
- Added a regression contract and `test:stale-retry-lease-fencing`.

## Validation boundary

This is Supabase Edge Function and SQL migration source. No production Supabase migration or function deployment was performed. Cloudflare Pages is used for the website preview and does not deploy Supabase backend code. PR merge is gated on successful Cloudflare Pages preview and code validation.


## Preview revision

Cloudflare Pages preview must correspond to the final PR head commit, not an earlier commit in the same branch. The earlier successful preview for commit `10459d7` predates the final worker and regression-check refinements; wait for Cloudflare's success report on the current head before merging.
