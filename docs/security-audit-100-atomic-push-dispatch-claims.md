# Security Audit 100 — Atomic Push Dispatch Claims

## Defect
The succeeded-ledger guard prevents sends after a prior success is visible, but two concurrent sender invocations can both read a non-succeeded row before either records its provider outcome. Both can then send to the same FCM token.

## Source correction
Migration `20261105210000_atomic_notification_push_dispatch_claims.sql` adds a per-device dispatch lease and a service-role-only RPC. The RPC uses one conditional UPDATE on the unique notification/device row and grants the lease only when the row is pending/retryable and no unexpired dispatch lease exists. Concurrent updates serialize; only the successful updater receives `true`.

The sender obtains the claim before requesting the FCM access token and sends only tokens for which it acquired a claim. A claim lookup error fails closed. After it persists the provider outcome, it clears the dispatch lease.

## Validation
The atomic claim contract test verifies migration guards, the single-winner return condition, bounded lease duration, claim-before-FCM ordering, filtering, and lease cleanup. CI runs this contract alongside existing push ledger and retry-worker tests.

## Limits / operational caveat
This is a bounded concurrency guard, not a mathematical exactly-once guarantee. A process crash or network ambiguity after FCM accepts a message but before the outcome is persisted can still leave an uncertain delivery; the lease expires to permit recovery. The migration must be applied and the updated Edge Function deployed together before production benefits. No production mutation was made during this source change.
