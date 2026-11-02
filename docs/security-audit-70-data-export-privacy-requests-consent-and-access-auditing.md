# Security Audit 70 — Customer Data Export, Privacy Requests, Consent Records and Personal-Data Access Auditing

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration-history review  
**Release status:** **NOT PRODUCTION READY**

## Scope and method

Reviewed the customer data Edge Function, technician data Edge Function, customer registration UI, administrator data Edge Function and the 2026-10-10 public-table lockdown migration. Focus areas were self-service data access/export, privacy request intake and fulfilment, consent capture/versioning, and audit evidence for access to personal or sensitive records.

## Executive summary

**New findings: 3 (2 Medium, 1 Low).** Authenticated customer APIs expose profile, bookings, payments, reviews and notification data in separate responses, but the reviewed source does not provide a consolidated downloadable export or privacy-request workflow. The customer registration form has no visible privacy/terms acknowledgement or consent capture in the inspected form markup, and no consent version/purpose/timestamp record is created in the reviewed customer registration flow. The reviewed customer and technician data endpoints do not emit record-level personal-data access audit events.

These observations are bounded to the reviewed source files. They do not prove that no external privacy policy, manual support process, reverse-proxy logging or separate audit system exists.

## Finding F70-01 — No consolidated customer personal-data export or privacy-request workflow identified

**Severity: Medium**

The customer-data Edge Function provides authenticated actions including:
- `account`: returns customer profile, customer-owned bookings, up to 20 customer notifications and reviews.
- `payments`: returns payment rows associated with the authenticated customer's mobile.
- `bookings`, `booking_refs`, `reviews`, and `completed_bookings`: return additional subsets.

These are useful account-view endpoints, but the reviewed source does not implement a consolidated export artifact (for example, a user-downloadable JSON/CSV archive), a privacy-request submission/status action, or a documented fulfilment workflow. The account response also limits notifications to 20 and the payment endpoint is separate, so the account response alone is not a complete export of even the categories exposed by these APIs. No equivalent technician personal-data export action was identified in the reviewed technician-data action switch.

**Impact:** A customer or technician may be unable to obtain a complete, portable copy of the personal information held by the platform through a clear, self-service mechanism. Support-led fulfilment may exist outside the reviewed code, but is not evidenced here.

**Remediation:**
1. Define an authenticated privacy-request intake workflow with request type, requester identity, scope, status, due date, and secure response channel.
2. Implement an export manifest covering profile, bookings, payment references, reviews, support interactions, notifications, technician application/KYC metadata, wallet and job records as appropriate.
3. Paginate all datasets and include explicit completeness metadata; do not silently truncate at UI/API limits.
4. Exclude passwords, session tokens, OTPs, FCM tokens, private storage object paths, and other secrets from exports.
5. Require re-authentication/step-up verification, rate-limit requests, audit access and export generation, and expire download links.
6. Document third-party, legal-retention and other permitted exclusions so the export is accurate without disclosing another person's information.

## Finding F70-02 — Consent capture and versioned consent evidence not identified in customer registration flow

**Severity: Medium**

The inspected `src/pages/CustomerRegister.tsx` registration form displays fields for name, mobile, password, email, city and address, followed by the email-OTP action. The reviewed form markup contains no visible required checkbox or acknowledgement linking to privacy terms/terms of service. The reviewed `customer-auth` registration flow stores customer registration data and verifies the email OTP, but no consent purpose, policy version, notice version, timestamp or withdrawal record is written as part of the inspected flow.

This is a source-visible gap in the reviewed customer registration path. It does not establish whether a separate website-wide notice or other non-code consent process exists, nor does it make a legal conclusion about what consent is required.

**Impact:** The platform may be unable to demonstrate what privacy notice or terms were presented to a customer at registration, which version applied, and when the customer acknowledged it. A generic account creation timestamp is not equivalent to purpose-specific, versioned consent evidence.

**Remediation:**
- Present accessible links to the applicable privacy notice and terms at registration and other relevant collection points.
- Capture only the acknowledgements and permissions actually required for the defined purposes; avoid bundling optional marketing consent with essential service processing.
- Store notice/policy version, purpose, actor/account, timestamp, collection channel and evidence of the action.
- Record subsequent notice updates and any withdrawal/change of optional permissions.
- Apply equivalent, role-appropriate notices to technician onboarding, including KYC and location/device permissions where relevant.
- Add automated tests proving required acknowledgements cannot be bypassed and optional permissions are not preselected.

## Finding F70-03 — Record-level personal-data access auditing not evidenced in reviewed customer and technician data APIs

**Severity: Low**

The reviewed `customer-data` and `technician-data` Edge Functions authenticate the caller and return personal information, but do not emit a record-level audit event for each sensitive data access in their inspected action paths. The reviewed `admin-data` function also exposes broad administrative data actions, including customer and technician list operations. The lockdown migration comments that audit events can be appended by the existing client logger and revokes public-role SELECT/UPDATE/DELETE privileges on `audit_logs`; this establishes a restriction on direct public access to that table, not that sensitive reads are consistently logged or that an operator can review a complete access trail.

**Impact:** Following suspected misuse or an account compromise, investigators may lack reliable evidence of which administrator or account accessed which category of personal data, when, and through which operation. This is particularly relevant to KYC and other sensitive technician/customer information.

**Remediation:**
1. Emit server-side structured access events for sensitive read/export operations, especially admin access to customer, technician, KYC, payment and support records.
2. Record actor ID/role, action, target record or bounded target set, timestamp, request/correlation ID, outcome and purpose/reason where appropriate.
3. Never log passwords, bearer/session tokens, OTPs, full payment credentials, KYC document contents or unnecessary personal-data payloads.
4. Make audit records append-only to application roles and reviewable by a separately authorized security/privacy role.
5. Alert on bulk reads, unusual access volume and repeated failed access attempts.
6. Test that successful and denied sensitive access attempts produce appropriately redacted audit events.

## Positive controls observed

- Customer identity is resolved from a valid, unexpired server-side customer session before customer-data actions execute.
- Customer profile, bookings, reviews and notification reads are scoped using the authenticated customer ID or associated mobile recipient key.
- Technician identity is resolved from the server-side technician session; inactive technicians are blocked from protected actions.
- Customer-data has an explicit booking column allowlist for key booking views and recursively removes named internal capability fields such as OTP/action tokens.
- The 2026-10-10 migration revokes direct public-role access to customers, notifications and other operational tables; the migration comments that audit logs may be appended but not publicly read, rewritten or deleted.
- Admin-data requires an unexpired admin session and re-checks that the admin is an active super_admin.

## Carry-forward / previously identified issues — not counted as new

- Broad administrator `select("*")` reads and blacklist-based sensitive-field sanitization were raised in earlier privacy/admin-data audits, including Audit 38. Audit 70 references the exposure context but does not count it again.
- Absence of a retention schedule, data-erasure workflow and complete privacy governance was raised in Audits 38 and 69.
- Account deletion/closure and session/device cleanup gaps were raised in Audit 69 and Audit 68.
- This audit does not re-count those earlier findings.

## Verification limits

This review inspected source files on the named branch and migration text only. It did not inspect the live database, deployed privacy notice, external support processes, actual audit-log rows, Cloudflare request logs, third-party processors, backups, or production consent records. It did not execute SQL, modify database state, run builds/tests, deploy, trigger GitHub Actions, or merge any branch. The absence of a feature in the reviewed source is not proof that no manual or external process exists.

## Release decision

**NOT PRODUCTION READY.** Establish a documented privacy-request/export process, add versioned consent/notice evidence appropriate to each collection purpose, and implement server-side audit trails for sensitive personal-data access. Validate the complete workflow against applicable legal requirements with qualified counsel and verify the deployed implementation before release.
