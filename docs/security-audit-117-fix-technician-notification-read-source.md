# Security / reliability audit 117 — technician notification read source

## Confirmed defect

The technician account endpoint returns two notification collections. The `notifications` collection is sourced from `public.notifications`, while `jobNotifications` is sourced from `public.technician_notifications`. The shared client loader intentionally displays `jobNotifications` for technician recipients.

The single-notification read endpoint accepts a source discriminator. In `technician-data`, `source: "wallet"` updates `technician_notifications`, while `source: "job"` updates `notifications`. The shared client incorrectly sent `source: "job"` for the technician list it had just loaded. As a result, the row ID was looked up in the wrong table and the read operation could fail with "Notification not found".

## Fix

Changed the technician notification read request to send `source: "wallet"`, matching the actual `technician_notifications` source returned by the account endpoint. No database schema, migration, Edge Function, or production data was changed.

## Regression coverage

Added `scripts/technician-notification-read-source-check.mjs` and npm script `test:technician-notification-read-source`. The contract check verifies the account payload source, the Edge Function's source-to-table mapping, and the client discriminator.

## Validation boundary

The source change, regression script, package script, and this document were committed to the feature branch. Unless a later execution result is recorded, do not interpret the existence of the regression script as a successful runtime test. Full typecheck, browser test, and live Edge Function behavior are not claimed.

## Deployment

Cloudflare Pages preview success for the exact PR head SHA is the only website merge gate. Vercel and GitHub Actions are not deployment gates. A Cloudflare preview is not a claim that production has been deployed. No production Supabase or Firestore changes are included.
