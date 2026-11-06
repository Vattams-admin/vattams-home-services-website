# Investigation 332 — Persist FCM transport failures per device

## Defect
The sender dispatched device requests inside Promise.all without isolating fetch transport exceptions. A thrown network error rejected the entire batch, bypassing the per-device delivery ledger updates for all in-flight results and returning through the outer handler. Pending dispatch leases could remain until expiry.

## Fix
Each FCM fetch is now isolated in a per-device try/catch. A transport exception is classified as FCM_NETWORK_ERROR, treated as a retryable provider failure, and persisted through the same per-device outcome update path. Other devices continue through their own outcome handling.

## Regression coverage
The push delivery ledger contract verifies transport-exception isolation, error classification, and retryable outcome persistence.

## Delivery semantics
A transport exception can occur after the provider has received a request but before the sender receives a response. The ledger records this as retryable because acceptance cannot be confirmed; therefore duplicate delivery remains possible in this ambiguous network-failure case. This change prevents the entire batch from abandoning ledger updates, but it does not claim exactly-once FCM delivery.

## Scope
GitHub source and CI only. No production Supabase mutation, migration, or Edge Function deployment is included.
