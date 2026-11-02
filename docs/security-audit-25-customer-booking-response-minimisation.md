# Security Audit 25 — Customer booking response minimisation

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** `supabase/functions/customer-data/index.ts` booking response contract.

## Finding

The customer-data Edge Function used `bookings.select("*")` for three customer-session-owned response paths:
- `account` (dashboard payload)
- `bookings` (booking history)
- `completed_bookings` (review eligibility/history)

The function already recursively removed the exact OTP and capability keys from serialized responses. That is useful defense in depth, but broad database selection still retrieves every booking column into the service-role Edge Function and makes future schema additions part of the response contract unless explicitly stripped.

## Change committed

Added `CUSTOMER_BOOKING_COLUMNS`, a named explicit allowlist, and used it for all three booking queries. The allowlist contains customer-facing booking references, service and appointment details, status, approved price breakdown, timestamps used by the UI, review technician reference, and invoice/review metadata. It excludes:
- `start_otp`
- `complete_otp`
- `booking_action_token`
- `payment_action_token`
- other operational columns not needed by the customer booking pages (for example internal technician notes and commission/call-rate fields).

The recursive response sanitizer remains as defense in depth.

## Compatibility review

The allowlist retains `assigned_technician_id`, which the customer review submission flow passes as the technician reference. It also retains fields consumed by CustomerDashboard, CustomerBookings, CustomerReviews and the invoice rendering interface.

The `booking_refs` action already selects only `id,service_category,booking_number` and was left unchanged.

## Verification status

Source inspection confirms all three booking queries now use the explicit allowlist and no booking query in this Edge Function uses `select("*")`.

Not yet verified:
- Deno typecheck / Edge Function build
- Browser runtime response contract
- Integration tests using a representative booking record
- Production deployed function and schema compatibility

## Remaining adjacent scope

This pass does not yet narrow the `payments.select("*")`, `notifications.select("*")`, or `reviews.select("*")` queries. Those require their own UI contract mapping and should be handled in follow-up audits rather than silently assumed safe.

**Release status remains NOT PRODUCTION READY.** No production database writes, migrations, function deployments, or Cloudflare deployments were performed.
