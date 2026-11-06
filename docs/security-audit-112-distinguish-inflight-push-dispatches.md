# Security Investigation 112 — Distinguish in-flight push dispatches from successful delivery

## Finding

The push sender previously returned `skippedAlreadySucceeded: tokens.length` whenever no device remained eligible after atomic dispatch claims. That condition also occurs when every claim is rejected because another sender currently holds a valid `dispatch_lease_until`. The response therefore reported an in-flight delivery as already succeeded.

The retry worker treated any sender response with `perDeviceTracking: true` as tracked, and could return HTTP 200 with zero provider failures. A scheduler could therefore see a green batch even though this retry did not send or confirm delivery.

## Change

- The sender reads the ledger state when all candidate claims are rejected.
- It counts confirmed `succeeded` rows separately from pending/retryable rows with a future dispatch lease.
- It returns HTTP 409 and `inFlight: true` when another sender owns an active dispatch lease.
- The retry worker recognizes that signal, reports an `inFlight` aggregate, and returns HTTP 500 for the batch.
- The retry worker deliberately does **not** call the defer RPC for this condition. Clearing the dispatch lease would allow a second sender to send while the first sender is still in flight, creating a duplicate-notification risk.
- The retry worker's own claim lease is allowed to expire; the normal claim path can retry after the competing sender lease expires.

## Regression coverage

`scripts/notification-push-retry-worker-contract-check.mjs` now checks:
- sender conflict response and separate success/in-flight counts;
- retry worker recognition and aggregation of in-flight conflicts;
- non-2xx scheduler status for an in-flight batch;
- preservation of the competing sender's dispatch lease.

Run: `npm run test:notification-push-retry-worker`.

## Deployment boundary

This PR changes Supabase Edge Function source only. It does not deploy either Edge Function, apply database migrations, configure a scheduler, or mutate production Supabase. Production rollout and live verification remain separate and require explicit authorization.

Cloudflare Pages preview is the only website deployment gate. The exact PR head must have a successful Cloudflare Pages preview before merge. A Pages preview does not deploy Supabase Edge Functions.
