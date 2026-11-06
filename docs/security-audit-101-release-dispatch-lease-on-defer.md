# Investigation 329 — Release stale dispatch lease on retry defer

## Defect
The retry worker's defer RPC released `lease_until` but did not clear `dispatch_lease_until`. If sender dispatch failed before it persisted a per-device provider outcome (for example, FCM credential acquisition failed), the retry was rescheduled but remained blocked by the abandoned sender lease until its timeout.

## Fix
Migration `20261106220000_release_dispatch_lease_on_retry_defer.sql` replaces `defer_notification_push_retry` so it clears both the worker lease and sender dispatch lease while preserving the existing attempt counter, terminal threshold, and exponential backoff behavior.

## Regression coverage
The PostgreSQL integration workflow applies the new migration and explicitly seeds both leases before calling the defer RPC. It asserts that both lease columns are NULL afterward and that the existing first retry backoff remains 30 seconds.

## Scope
Source and CI only. No production Supabase mutation or Edge Function deployment is performed by this change.
