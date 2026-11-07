# Reliability fix 119 — preserve atomic technician notification read-all

## Investigation finding

The technician notification mark-all-read action in the post-PR-204 source issued two independent table updates in parallel and derived its `updated` response from returned row arrays. This bypassed the existing service-role-only PostgreSQL RPC `mark_technician_notifications_read_all(uuid)`, which already updates both technician notification sources in one transaction and returns exact per-table row counts.

This created two problems:
- Atomicity regression: one update could commit while the other failed.
- Count reliability: returned row arrays can be capped independently of the actual number of updated rows.

## Fix implemented

- Restored the existing `mark_technician_notifications_read_all` RPC call in `technician-data`.
- Read and validate the RPC's `technician_notifications_updated` and `job_notifications_updated` counts.
- Return their exact sum as `updated`.
- Expanded `scripts/atomic-technician-notification-read-all-check.mjs` to assert the RPC result count contract.
- Registered `test:atomic-technician-notification-read-all` in package.json.

## Deployment boundary

The RPC migration already exists in repository history. This change modifies Edge Function source and does not deploy it. Cloudflare Pages deploys the frontend only, not Supabase Edge Functions. No production Edge Function deployment, migration, database mutation, or Firestore write was performed.

## Validation

The changed source and regression assertions were inspected after commit. The Node regression script, Deno checks, TypeScript checks, and live database tests have not yet been executed. Do not claim production-active until the updated `technician-data` Edge Function is separately deployed and verified.

## Release gate

Cloudflare Pages successful preview for the exact current PR head is the only website merge gate. Ignore Vercel and GitHub Actions for deployment decisions.
