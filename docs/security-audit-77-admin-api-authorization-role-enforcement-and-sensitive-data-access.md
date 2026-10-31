# Security Audit 77 — Admin API Authorization, Role Enforcement, Privilege Boundaries and Sensitive-Data Access

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 0.** The reviewed `admin-data` endpoint validates a server-side admin session, checks that the supplied admin ID matches the session, verifies the session expiry, and re-reads the admin account to require an active `super_admin` role before dispatching any action. The admin login endpoint also only issues sessions to active super-admin accounts.

The main residual concerns are already tracked: the broad super-admin API returns entire customer, technician, booking and payment rows using `select(*)`; the FCM endpoint checks active status but does not enforce the `super_admin` role; and the admin API has no operation-level role separation because all actions share the same super-admin gate. These are carry-forward items, not newly counted findings.

## Scope and evidence reviewed

- `supabase/functions/admin-data/index.ts`
- `supabase/functions/admin-auth/index.ts`
- `supabase/functions/fcm-data/index.ts`
- `src/lib/adminData.ts`
- `src/pages/AdminDashboard.tsx`

## Positive controls observed

### Admin-data server-side authorization

The `admin()` helper looks up `admin_auth_sessions` by the submitted token, checks that its `admin_id` matches the supplied ID and rejects expired sessions. It then queries `admin_users` and requires `role === "super_admin"` and `is_active === true`. The request is rejected before the action switch when authorization fails.

### Login gate

`admin-auth` checks the bcrypt password and refuses to create a session unless the account role is `super_admin` and `is_active` is true. Successful sessions have an eight-hour expiry.

### Client helper does not replace trusted session fields

`src/lib/adminData.ts` obtains the admin ID and token from session storage, then spreads the caller payload before writing the canonical action, admin ID and admin session token. Payload fields cannot override those trusted values.

### KYC object paths are not returned by admin-data

The recursive sanitizer strips OTP and booking/payment capability fields. For Aadhaar, PAN and driving-licence storage paths it returns boolean `has_*` indicators instead of the object path. The separate technician-auth `doc-url` flow performs an active super-admin session check before issuing a short-lived signed document URL.

## Carry-forward findings — not counted as new

### 1. FCM admin role enforcement — Audit 47

In `fcm-data`, admin authorization verifies the session, matching admin ID and `is_active`, but the query result's role is not checked. An active non-super-admin account with a valid admin session could pass this endpoint's admin authorization branch if such an account/session exists. This is the previously tracked Audit 47 issue, not a new finding in this pass.

### 2. Broad administrative data exposure — Audits 38, 60 and 70

The admin-data actions for `bookings`, `technicians`, `customers` and `payments` use `select("*")`. The sanitizer removes a small set of sensitive capability fields and hides KYC object paths, but it is a blacklist-style recursive filter rather than a per-action allow-list. Wallet transactions and recharge records also return broad row shapes. This remains a data-minimization and privileged-access concern already recorded in earlier audits.

### 3. No operation-level role separation or step-up — Audit 71

All admin-data actions share the same active-super-admin gate. The source does not implement distinct permissions for read-only analytics, customer/technician PII access, payment approval, wallet operations, booking lifecycle changes or pricing changes. There is also no fresh-auth/MFA step-up in the reviewed action dispatch. This is the previously tracked role-separation and step-up gap.

### 4. Admin booking lifecycle direct update — Audits 49, 64 and 74

The `booking_status` action permits a broad status allow-list. Cancellation uses `cancel_booking_atomic`, while non-cancellation statuses are written directly to the booking row. This remains the previously recorded lifecycle/consent/completion authorization concern.

## Verification limits

This is a source-only review of the named branch. It does not prove which functions are deployed, whether non-super-admin admin accounts currently exist, or whether production sessions and grants match the reviewed code. No live role-matrix tests, unauthorized FCM calls, PII export tests, SQL/database inspection, migrations, builds, automated tests, deployment, GitHub Actions run or merge were performed.

## Release decision

**NOT PRODUCTION READY.** Keep the server-side session and active-super-admin checks. Before release, enforce role checks consistently across every admin-facing endpoint, define operation-specific permissions and step-up requirements for high-impact actions, and replace broad administrative `select(*)` responses with explicit field allow-lists.
