# Security Audit 38 — Data Privacy, Consent, Retention and Data Rights

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Customer/technician personal data lifecycle, consent evidence, account access, export, deletion, retention, session lifecycle, KYC and administrative exposure.  
**Method:** Read-only review of the customer/technician/admin Edge Functions and the migration history listed below. No live database, production bucket, privacy notice, deployed website, or legal documentation was inspected.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository has meaningful privacy safeguards: later migrations revoke direct public access to customer and OTP tables, customer/technician sessions are stored server-side with expiry, and KYC documents are kept in a private bucket without browser read access. However, the reviewed account APIs do not provide a complete personal-data export or account-erasure workflow; there is no demonstrated retention/deletion schedule for expired sessions, OTPs, notifications, support messages, booking history or KYC evidence; and explicit consent/version evidence is not represented in the reviewed customer/technician schemas. Admin dashboard endpoints also return broad records with `select("*")`, increasing the amount of personal data exposed to any compromised admin session.

## Findings

### F38-01 — HIGH: No customer/technician personal-data export workflow was found in reviewed account APIs

**Evidence**
- `supabase/functions/customer-data/index.ts` exposes account, payments, bookings, booking references, profile, reviews, completed bookings, notifications and support submission actions.
- `supabase/functions/technician-data/index.ts` exposes account, job status and notification-read actions; its account response includes technician profile, jobs, wallet transactions, recharges and notifications.
- The inspected functions contain no export request, downloadable archive, machine-readable personal-data package, export status or export audit event.
- The inspected migrations do not define an export-request table or export job.

**Risk**
The repository does not demonstrate a user-accessible way to obtain a complete copy of personal data associated with an account. The data is spread across bookings, payments, support, reviews, wallet records, KYC storage and notifications, so a profile-only download would not constitute a complete export.

**Required remediation**
- Implement authenticated export requests for customer and technician accounts.
- Inventory and export all linked personal data, including attachments and relevant audit metadata, with a clear scope and exclusions.
- Deliver exports through a private, short-lived download URL and record request, generation, access and expiry.
- Verify ownership, prevent cross-account export, and test large datasets and retry/idempotency behavior.

### F38-02 — HIGH: No account-erasure/deactivation workflow or dependent-record disposition process was found

**Evidence**
- The inspected customer-auth actions include logout, registration, login, password reset/change and OTP operations; no customer account deletion/deactivation action was found.
- The inspected technician-auth handler contains registration/login and document-access flows; no technician self-service deletion/deactivation workflow was found.
- The inspected customer-data and technician-data handlers contain no account-erasure action.
- Relevant schemas contain linked booking, payment, support, review, wallet, KYC and session records. The customer session table uses a cascading foreign key to customers, while support and review records use `ON DELETE SET NULL`; other financial/booking retention implications require explicit analysis before deletion.

**Risk**
Users have no demonstrated account closure and personal-data disposition path. A simplistic hard delete could also destroy financial or dispute evidence, orphan operational records, or conflict with legitimate retention requirements. No controlled pseudonymization/retention exception workflow is demonstrated.

**Required remediation**
- Define account closure, deactivation, identity verification, cooling-off and appeal rules.
- Build a dependency-aware deletion/pseudonymization workflow with legal/financial/dispute holds and documented exceptions.
- Revoke all active sessions and device tokens immediately when closure is approved.
- Remove or anonymize data no longer required; preserve only data with a documented lawful/operational basis and retention period.
- Record who approved the request, what was erased/retained, why, and when.

### F38-03 — HIGH: No enforceable data-retention and purge schedule is demonstrated

**Evidence**
- The reviewed migrations create OTP, session, notification, support, booking, review, payment and KYC-related structures, but the inspected migration set does not establish a unified retention policy or scheduled purge for expired OTPs/sessions or aged notifications/support records.
- Session schemas include `expires_at` and auth handlers reject expired sessions, but the code does not demonstrate deletion of expired session rows as a background lifecycle.
- OTP flows remove superseded rows for a given mobile/purpose in selected paths, but no global expired-OTP cleanup schedule was found.
- No retention metadata, legal hold or deletion audit is represented in the reviewed support/KYC schema.

**Risk**
Expired or obsolete personal data may accumulate indefinitely. More stored data increases the impact of credential compromise, insider misuse, accidental exposure and future breach. Conversely, deleting records without a documented hold process may destroy evidence required for an active complaint or financial dispute.

**Required remediation**
- Define category-specific retention periods for OTPs, sessions, device tokens, support cases, notifications, KYC, bookings, payment evidence and audit records.
- Implement scheduled, observable purge/anonymization jobs with dry-run reporting and failure alerts.
- Apply legal-hold and active-dispute exceptions with expiry/review dates.
- Record deletion outcomes and prove that object storage, backups, replicas and logs follow the intended lifecycle.
- Verify the schedule against applicable Indian privacy, consumer, tax and financial record obligations with qualified counsel.

### F38-04 — MEDIUM: Explicit privacy notice/consent version and purpose records are not represented in reviewed account schemas

**Evidence**
- The inspected customer schema stores name, mobile, email, password hash, city, address and timestamps.
- The inspected technician registration payload stores identity/KYC, bank/payout, service and contact details, but the reviewed registration flow does not persist a privacy-notice version, consent timestamp, purpose/notice version or consent withdrawal record.
- The inspected migrations do not define a consent ledger or notice-version table.
- No deployed privacy notice or consent UI was reviewed in this audit.

**Risk**
The repository does not establish which notice a user saw, when they accepted it, which processing purposes were explained, or how consent/notice changes are tracked. This weakens accountability and the ability to demonstrate transparent collection and purpose limitation. This finding does not establish that no notice exists elsewhere in the deployed website.

**Required remediation**
- Inventory every data collection point and map fields to stated purposes, recipients, processors and retention periods.
- Persist notice/version, acknowledgement timestamp, account identity, purpose and collection channel where appropriate.
- Separate necessary service processing from optional marketing/communications consent.
- Implement consent withdrawal/preference management and preserve historical evidence without treating withdrawal as retroactive deletion of required records.
- Review wording and implementation with qualified privacy counsel.

### F38-05 — MEDIUM: Admin APIs expose broad personal-data records rather than task-specific projections

**Evidence**
- `supabase/functions/admin-data/index.ts` uses `select("*")` for bookings, technicians, customers, wallet transactions, recharges and payments.
- The admin response sanitizer removes selected OTP and capability fields, but it is a blacklist rather than a strict field allowlist.
- The reviewed admin gate requires an unexpired admin session and an active `super_admin`; however, all reviewed admin data actions share that broad role boundary.
- Prior security audits separately identified sensitive KYC and financial PII exposure concerns in admin payloads.

**Risk**
A compromised admin session or unintended frontend logging can expose substantially more personal and financial information than a specific task requires. Blacklist sanitization can miss newly added sensitive columns as schemas evolve.

**Required remediation**
- Replace broad `select("*")` with task-specific field allowlists and dedicated response DTOs.
- Separate support, KYC, financial and general operations privileges.
- Mask bank, identity and contact fields by default; require a documented privileged workflow for unmasking.
- Add access logging for sensitive reads and exports, plus tests that fail when sensitive columns appear in ordinary responses.

### F38-06 — MEDIUM: Session expiry is enforced at request time, but complete revocation and cleanup are not demonstrated across lifecycle events

**Evidence**
- Customer logout deletes the supplied customer session token; customer login deletes existing sessions for that customer before creating a new session.
- Customer password reset and password change update the password but the inspected handlers do not revoke all existing sessions after the change.
- Technician login deletes existing technician sessions before creating a new one; the inspected technician handler did not show a corresponding self-service logout or password-change session-revocation workflow.
- Session tables have `expires_at` indexes and are inaccessible to anon/authenticated roles in the reviewed migration.
- Admin session management is separate and does not establish customer/technician lifecycle behavior.

**Risk**
A stolen session may remain usable until expiry or until a later login invalidates it. Password changes and recovery should be treated as high-risk security events that invalidate previously issued credentials. Expired rows also remain unless a separate cleanup job exists.

**Required remediation**
- Revoke all sessions on password reset/change, account closure, suspected compromise and admin-initiated security reset.
- Provide explicit logout-all-devices and per-device session management.
- Record session creation, last use, device metadata and revocation reason without collecting excessive fingerprint data.
- Implement and monitor expired-session cleanup.
- Test stolen-token replay after password reset, logout and account deactivation.

### F38-07 — MEDIUM: KYC and payout data require a documented lifecycle, access audit and retention boundary

**Evidence**
- `20260812120000_secure_technician_docs_storage.sql` and `20261031120000_tighten_technician_kyc_upload_policies.sql` concern private technician document storage; the latter explicitly states that the bucket remains private and has no anon/authenticated SELECT policy.
- The latest KYC policy migration acknowledges that anonymous registration uploads cannot prove ownership of the mobile-number folder and calls for an OTP-bound, server-issued upload capability.
- Technician registration stores identity-document references and bank/payout fields.
- The inspected account/administration code does not demonstrate a complete KYC retention schedule, document deletion request lifecycle, or immutable document-access audit.

**Risk**
Identity and financial documents are high-impact personal data. Private bucket access is a positive control, but without ownership-bound uploads, narrow staff access, access auditing, retention and deletion controls, privacy risk remains.

**Required remediation**
- Complete OTP-bound, server-issued KYC upload authorization and bind object ownership to the verified applicant.
- Keep KYC objects private and issue short-lived URLs only after role/session/need-to-know checks.
- Log each privileged document view/download and alert on unusual access.
- Define retention by KYC status, account lifecycle, legal obligations and dispute holds; purge objects and derivatives when permitted.
- Minimize copies in logs, exports, backups and admin payloads.

## Positive controls observed

1. Customer and OTP tables are locked from anon/authenticated direct access by `20261006160000_lock_customer_auth_tables.sql`; public policies are dropped and privileges revoked.
2. Customer and technician session tables are RLS-enabled and direct anon/authenticated grants are revoked in `20261005053000_add_customer_technician_auth_sessions.sql`.
3. Customer and technician APIs resolve account identity from server-side session records rather than trusting a caller-supplied account ID for ordinary account reads.
4. Customer logout deletes the presented session token.
5. Customer and technician login invalidate prior sessions for the same account before issuing a new one.
6. The KYC bucket policy migration explicitly removes anonymous document SELECT and overwrite access; the bucket is intended to remain private.
7. Customer account/profile responses omit password hashes; customer login also strips password_hash from its response.

## Verification not performed

- No live production database, Storage policy or bucket inspection.
- No deployed website/privacy notice/consent UI review.
- No account export/deletion request test because no such route was found in the reviewed handlers.
- No scheduled job, backup lifecycle, object retention or log-retention inspection.
- No legal assessment of Indian privacy, consumer, tax or financial record obligations.
- No production API, session replay or cross-account authorization testing.
- No Cloudflare deployment or GitHub Actions workflow was run.

## Required release gates

1. Implement verified customer/technician data export.
2. Implement account closure, erasure/pseudonymization, legal holds and session/device revocation.
3. Define and enforce category-specific retention and purge schedules across database, storage, logs and backups.
4. Add consent/notice version evidence and granular communication preferences.
5. Replace admin broad reads with allowlisted DTOs and sensitive-data access logging.
6. Complete KYC upload ownership, staff access audit and retention controls.
7. Validate the final privacy lifecycle against applicable law with qualified counsel and test it end-to-end.

**Conclusion:** Audit 38 is complete as a repository-source review. Private-table and KYC storage protections exist, but data export, account erasure, retention enforcement and consent evidence are not demonstrated in the reviewed implementation. The marketplace remains **NOT PRODUCTION READY**.
