# Investigation 331 — Release partial dispatch claims on claim RPC failure

## Defect
The push sender acquires per-device dispatch leases in parallel. If one or more claim RPC calls fail while other calls succeed, the handler returned HTTP 503 immediately. The successful claims were not released, so those devices remained blocked until their 180-second dispatch leases expired even though the sender did not begin FCM delivery.

## Fix
When any claim RPC fails, the sender now gathers only the successful claim IDs and clears their dispatch leases, constrained to the same notification and pending/retryable delivery rows. It records cleanup failures in trackingFailures and still returns HTTP 503. It does not release claims belonging to other notifications or rows in terminal/succeeded states.

## Regression coverage
The atomic dispatch source contract now checks that partial claim errors release only successfully claimed pending/retryable device rows before returning.

## Scope
GitHub source and CI only. No production Supabase mutation, migration, or Edge Function deployment is included.
