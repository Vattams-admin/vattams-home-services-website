# Investigation 328 — Real concurrent dispatch claim regression

## Gap
The static contract test and existing retry PostgreSQL integration did not invoke the new dispatch-claim RPC from two overlapping database sessions. Thus they did not empirically validate the concurrency property.

## Fix
The PostgreSQL integration workflow now applies migration 20261105210000_atomic_notification_push_dispatch_claims.sql and runs scripts/atomic-push-dispatch-concurrency-integration.sh. Session A starts a transaction, acquires the dispatch claim, and holds the transaction open for two seconds. Session B calls the same claim while A holds the row lock. The test requires A=true and B=false.

## CI wiring
The integration workflow path filters now include the new migration and concurrency script. The workflow applies the dispatch-claim migration after the retry-ledger migration and executes the two-session test.

## Scope
Test-only hardening. No production database changes or deployments.
