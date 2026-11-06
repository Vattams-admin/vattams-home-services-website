# Security audit 113 — fence push sender outcomes to dispatch lease ownership

## Defect
The push sender acquired an atomic per-device dispatch lease, but the lease had no identity returned to the sender. Its later outcome writes were filtered only by notification/device and by not-yet-succeeded status. If an FCM request outlived the dispatch lease, a newer sender could acquire the row; the older sender could then overwrite the newer sender's retryable/terminal outcome or clear the newer sender's lease.

## Fix
- Added `dispatch_lease_token` to the delivery ledger.
- Changed the atomic claim RPC to generate, persist, and return a unique UUID only to the winning sender.
- Sender outcome persistence now requires the exact lease token and clears that token atomically with the outcome.
- FCM bootstrap cleanup and partial-claim cleanup release only the exact lease token they acquired.
- A stale sender whose lease was superseded cannot mutate the newer sender's state; a zero-row outcome write is surfaced as a tracking failure.

## Validation
- Added `scripts/push-sender-dispatch-lease-fencing-check.mjs` source-contract regression coverage.
- This is source-level validation only until the project runtime runs the full test suite and the migration/function are deployed in an authorized backend rollout.
- No production Supabase migration or Edge Function deployment was performed.

## Deployment boundary
Cloudflare Pages is the website deployment gate. This change also includes a Supabase migration and Edge Function source update; Cloudflare Pages does not deploy those backend artifacts. Production backend rollout and live FCM concurrency testing remain separately gated by explicit authorization.
