# Investigation 333 — Validate push data before dispatch claims

## Defect
The push sender accepted the optional `data` property without checking its runtime JSON shape. A caller could submit `null`, an array, or a primitive despite the TypeScript interface. The sender acquired per-device dispatch leases and only later called `Object.entries(data)` inside the FCM batch, where malformed values could throw and abandon the batch with leases held until expiry.

## Fix
The sender now rejects non-object, null, and array `data` values with HTTP 400 before token lookup and before any dispatch-lease claim. Valid JSON objects retain the existing string-normalization behavior for FCM data values.

## Regression coverage
The push delivery-ledger contract asserts that the validation exists before both token lookup and the atomic dispatch-claim RPC call.

## Deployment scope
Source and regression contract only. No production Supabase mutation or Edge Function deployment was performed. Cloudflare Pages is the configured website deployment target; the Edge Function itself still requires its separately authorized Supabase deployment.

## Evidence boundary
This change prevents malformed request data from acquiring dispatch leases. It does not validate live FCM delivery or production deployment.
