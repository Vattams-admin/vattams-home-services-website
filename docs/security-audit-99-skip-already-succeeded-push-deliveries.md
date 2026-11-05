# Security Audit 99 — Skip already-succeeded push delivery rows

## Defect found

The push sender seeded the per-device delivery ledger and then sent to every selected active FCM token without first checking whether the notification/token pair was already recorded as `succeeded`. The later outcome update correctly avoided overwriting a succeeded row, but that protection happened **after** the provider send. A repeated sender invocation could therefore deliver the same notification again to a device whose ledger already recorded successful delivery.

## Source fix

Before obtaining an FCM access token or sending any messages, the sender now queries succeeded ledger rows for the notification and excludes those token IDs. If the ledger lookup fails, it fails closed with HTTP 503 rather than risking a duplicate send. If all selected devices have already succeeded, it returns a successful zero-send result with `skippedAlreadySucceeded`.

## Regression coverage

`scripts/push-delivery-ledger-persistence-check.mjs` now verifies that the succeeded-state lookup occurs before FCM access-token acquisition, succeeded token IDs are filtered, lookup errors fail closed, and an all-succeeded batch safely skips sending. The existing `test:push-delivery-ledger` command is already wired into Home Services Web CI.

## Scope and remaining limitation

This guard prevents repeat sends when a prior successful outcome is already visible before the next sender invocation. It does not provide a distributed exactly-once guarantee for two truly concurrent sender invocations that both inspect the row before either records success; that stronger guarantee requires an atomic per-device dispatch claim/lease protocol and must be treated as separate follow-up engineering. No production Edge Function, migration, scheduler, secret, Storage policy, or customer/technician data was changed by this source patch.
