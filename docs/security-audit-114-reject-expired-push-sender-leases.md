# Security audit 114 — reject expired push sender dispatch leases

## Defect
Investigation 340 added a unique dispatch lease UUID and required it on sender outcome writes. However, the UUID can remain stored after `dispatch_lease_until` expires. Before another sender replaces that UUID, the old sender could still match the token and persist an outcome even though it no longer owns a live lease. This left a narrow stale-sender race.

## Fix
- Prior delivery-state reads now include `dispatch_lease_until`.
- Sender outcome calculation requires the matching UUID and a lease expiry later than the attempt timestamp.
- The outcome UPDATE independently requires `dispatch_lease_until > attemptAt`, making the expiry condition atomic with the write.
- FCM bootstrap and partial-claim cleanup also require the exact token and an unexpired lease, so cleanup cannot act on expired reservations.
- Expired or superseded sender outcomes are surfaced as tracking failures.

## Regression coverage
Extended `scripts/push-sender-dispatch-lease-fencing-check.mjs` to assert the prior-state expiry check, atomic expiry predicate, and both cleanup expiry guards. Existing npm script `test:push-sender-dispatch-lease-fencing` continues to run this contract check.

## Validation limits
This change is source-level and regression-contract coverage. Full project tests and TypeScript typecheck must still be run in a suitable project runtime. Production backend rollout and live FCM concurrency testing remain separately gated by explicit authorization.

## Deployment boundary
Cloudflare Pages is the website deployment gate. This Edge Function source update is a Supabase backend artifact and is not deployed by Cloudflare Pages. No production Supabase function or migration was deployed.
