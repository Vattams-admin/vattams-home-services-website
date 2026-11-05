# Investigation 323 — Notification Retry Claim Parameter Validation

Date: 2026-11-05  
Repository: `Vattams-admin/vattams-home-services-website`  
Target: `main` via pull request

## Defect found and corrected

The PostgreSQL function `claim_notification_push_retries` validated retry claim arguments using ordinary range comparisons only. In PostgreSQL, comparisons with `NULL` evaluate to UNKNOWN, not TRUE. Consequently, a service-role caller passing a NULL `p_lease_seconds` could pass the validation block and write a NULL lease. That defeats the lease exclusion condition and can allow another worker to claim the same delivery while the first worker is still processing it. A NULL `p_limit` also removes the intended bounded-claim guarantee, and a NULL `p_max_attempts` silently suppresses eligible claims.

## Source fix

- Added explicit `IS NULL` validation for all three parameters before their range checks.
- Kept existing numeric bounds unchanged: limit 1–500, lease 15–900 seconds, maximum attempts 1–10.
- Extended the PostgreSQL integration workflow to assert that NULL limit, lease duration, and maximum-attempt values each raise `INVALID_RETRY_CLAIM_PARAMETERS`.

## Validation boundary

The change is committed to a dedicated PR branch. CI must execute the PostgreSQL integration test before merge. No production SQL, migration, Edge Function, scheduler, secret, or notification data was changed. This is a source-level hardening fix; it does not mean the retry worker is deployed or scheduled in production.
