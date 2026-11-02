# Security Audit 88 — Personal Data Exposure, API Response Minimisation and Privacy Boundaries

**Repository:** Vattams-admin/vattams-home-services-website  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Review type:** Read-only API and response-shape review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**2 new findings identified in the inspected API response paths:**
- **F88-01 — HIGH:** Admin API list and analytics paths use unrestricted `select("*")` for customer and technician records. The shared response sanitizer removes a small fixed set of capability fields and KYC URL fields, but does not remove password hashes or comprehensively project sensitive profile fields before returning records to the browser.
- **F88-02 — MEDIUM:** Technician account API returns every technician job record with customer name, mobile number, address and job notes, without a current/active-job filter or field-level minimisation. Historical customer PII remains available in the technician dashboard response.

These are authenticated API exposures, not evidence of anonymous access. Admin routes check a valid unexpired super-admin session and active super-admin account; technician routes check the session and active technician status.

## Scope and evidence

Reviewed:
- `supabase/functions/customer-data/index.ts`
- `supabase/functions/technician-data/index.ts`
- `supabase/functions/admin-data/index.ts`
- Related prior privacy findings in Audits 25, 38, 40, 53, 60, 75, 76 and 77.

## Findings

### F88-01 — HIGH: Admin API returns unrestricted customer and technician records

**Evidence**
- The admin-data `customers` action queries `customers.select("*")` and returns the resulting rows as `customers`.
- The `technicians` action queries `technicians.select("*")` and returns the rows as `technicians`.
- The `analytics_technician_performance` action also queries `technicians.select("*")` and returns each complete technician record nested in its analytics response.
- The shared admin response sanitizer removes only the named capability fields `start_otp`, `complete_otp`, `booking_action_token`, `payment_action_token`, plus `aadhaar_url`, `pan_url` and `dl_url`.
- It does not implement an allow-list of safe customer/technician fields and does not visibly remove `password_hash`.
- The customer and technician authentication handlers explicitly read and use a `password_hash` column for password verification. Therefore the unrestricted row selection can include password-hash material in the admin API response unless a database view/trigger or schema difference not visible in this source prevents it.

**Impact**
A browser session used by an admin dashboard receives more customer and technician data than is required for most list/analytics displays. In particular, password hashes should never be delivered to a browser, even to an authenticated administrator. A compromised admin browser session or XSS could expose the returned dataset and support offline password guessing.

**Recommended remediation**
- Replace every administrative `select("*")` with explicit, action-specific column projections.
- Exclude password_hash and all authentication/session secrets at the query boundary; do not rely on a blacklist sanitizer.
- Return separate minimal DTOs for customer list, technician list and analytics. Do not nest full technician rows in performance analytics.
- Review admin UI needs and reveal sensitive attributes only through narrowly scoped, separately authorized workflows with access logging.
- Add response-contract tests asserting that password_hash, OTPs, session tokens, KYC document paths, bank/UPI details and unnecessary PII never appear in admin JSON.

### F88-02 — MEDIUM: Technician dashboard receives historical customer contact and address data

**Evidence**
- Technician-data `account` returns all rows from `technician_jobs` matching the authenticated `technician_id`, ordered by assignment time.
- The selected columns include `customer_name`, `customer_mobile`, `customer_address` and free-text `notes`.
- The query has no status filter or bounded history limit in the inspected code.
- The same account response includes wallet transactions, recharge records, notifications and the technician profile.
- Technician authentication is checked, and the technician must currently be active for this account action; however, the data query includes historical jobs still associated with that technician.

**Impact**
A technician can continue receiving customer contact/address information and free-text job notes for completed or otherwise historical assignments. This increases exposure if a technician account is compromised, shared or retained after the operational need has ended.

**Recommended remediation**
- Separate active-job operational details from historical job summaries.
- Return customer mobile/address only for jobs in the permitted operational window and only while the technician is the current authorized assignee.
- For completed jobs, return only the minimum fields needed for earnings/history and support disputes; mask contact details and redact sensitive free-text notes where possible.
- Add bounded pagination and retention controls; log access to detailed customer PII.
- Confirm reassignment/cancellation immediately removes the former technician's access to customer details.

## Customer-facing API observations

The customer-data handler validates a customer session and scopes account, booking, review, payment and notification queries to the authenticated customer identity/mobile. This is a positive ownership boundary.

The customer account action returns:
- A projected customer profile (id, name, mobile, email, city and address).
- A fixed booking-column list including service address, problem description, schedule, status and pricing.
- Up to 20 notifications.
- Customer-owned review rows.

The customer payment action uses `select("*")` but filters by `payee_type = customer` and the authenticated customer's mobile. The reviews action also uses `select("*")` but filters by authenticated customer ID. These are ownership-scoped; nevertheless, explicit projections would reduce accidental exposure if new sensitive columns are added later.

## Admin boundary observations

- Admin-data verifies the supplied session token and admin ID against an unexpired server-side session.
- It reloads the admin record and requires `role = super_admin` and `is_active = true`.
- This protects the inspected admin-data actions from a caller who only supplies an arbitrary admin ID.
- The broad row selection remains a data-minimisation problem even with that authentication boundary.

## Carry-forward issues (not counted as new findings)

- Audit 53 and Audit 76 already recorded technician job history exposing customer PII and the absence of a current-job-only limit.
- Audit 60 recorded technician profile/bank/UPI data exposure and broad admin reads.
- Audit 77 recorded broad admin `select("*")` use and blacklist-based sanitization.
- Audit 38 recorded incomplete PII access audit/retention controls.
- Audit 40 recorded browser token storage and XSS/CSP concerns.
- Audit 75 recorded customer ownership scoping and guest capability limitations.

## Positive controls observed

1. Customer-data validates a server-side customer session before dispatching actions.
2. Customer account, bookings, reviews and notifications are scoped to the authenticated customer identity or mobile.
3. Technician-data validates a server-side technician session, reloads the technician record and blocks protected actions for inactive accounts.
4. Admin-data validates the admin session, admin ID, expiry, active state and super-admin role.
5. Admin response sanitizer removes selected OTP/action capability fields and KYC document URL fields.
6. Technician job status transitions use an atomic RPC with the authenticated technician ID.

## Verification limits

- Source review only; no live API calls, browser network capture, response-body inspection, database query or role-based penetration test.
- Database schemas and live deployed function versions were not independently inspected in this audit. The authentication source confirms password_hash is a field used by customer and technician auth, but actual deployed API response contents were not captured.
- No live RLS/grant policies, admin user activity, access logs, retention configuration or Cloudflare production behavior inspected.
- No customer or technician records, password hashes, bank details or KYC files accessed.
- No code changes, SQL, migrations, builds, tests, deployments, GitHub Actions execution or merges performed.

## Release decision

**NOT PRODUCTION READY.** Remove unrestricted customer/technician row selection from admin API responses and ensure authentication hashes can never reach the browser. Minimise technician access to customer contact/address data by job state and operational need. Verify actual response payloads in a controlled environment before release.
