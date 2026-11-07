# Reliability fix 118 — exact notification unread counts

## Confirmed defects

1. `fetchUnreadCount()` previously loaded the account notification arrays and counted them locally. Those arrays are intentionally capped: customer account returns 20 notification rows; technician account returns 30 rows from each of two sources. The client-side requested limit of 1,000 cannot bypass these server-side limits, so the unread badge undercounts older unread rows.
2. Technician notifications have two distinct storage sources: `technician_notifications` (wallet/job notification stream) and `notifications` (recipient_type=technician). The existing mark-all-read action only invoked `mark_technician_notifications_read_all`, which handled the first source. The second source could remain unread while the UI reported mark-all-read success.

## Implemented changes

- Added `notification_unread_count` action to customer-data. It uses an exact, head-only count scoped to the authenticated customer's mobile number and unread state.
- Added the same action to technician-data. It independently counts unread rows in both technician notification tables, scoped to the authenticated technician, and returns their sum.
- Added the same action to admin-data, scoped to the admin notification recipient.
- Updated `fetchUnreadCount()` to call the authenticated count action rather than loading capped notification arrays.
- Updated technician `notifications_read_all` to mark both technician notification sources read and return the combined updated-row count.
- Added `scripts/exact-notification-unread-count-check.mjs`, npm command `test:exact-notification-unread-count`, and source-contract assertions.

## Deployment boundary — important

These changes include Supabase Edge Function source files as well as frontend code. Cloudflare Pages deploys the website frontend; it does NOT deploy Supabase Edge Functions. A successful Cloudflare Pages preview can validate the website artifact but cannot activate the new server actions. The Supabase Edge Functions `customer-data`, `technician-data`, and `admin-data` must be deployed through the separately authorized Supabase release process before the new client count calls can work in production.

No Edge Function deployment, migration, production database write, or Firestore write was performed as part of this branch. Do not claim the unread-count fix is production-active until all three updated Edge Functions are deployed and live endpoint checks pass. The frontend and Edge Function source changes are being reviewed together; Cloudflare remains the only website deployment gate. Ignore Vercel and GitHub Actions.

## Validation boundary

Source-level changes and regression contract are committed to the feature branch. The regression script has not yet been executed in a repository runtime; full TypeScript check, Deno checks, browser tests, and live Supabase endpoint tests are not claimed.
