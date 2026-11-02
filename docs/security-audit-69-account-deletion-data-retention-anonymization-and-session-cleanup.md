# Security Audit 69 — Customer and Technician Account Deletion, Data Retention, Anonymization and Session Cleanup

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and migration-history review  
**Release status:** **NOT PRODUCTION READY**

## Scope

Reviewed customer and technician authentication/data Edge Functions, customer profile and dashboard UI, technician dashboard logout, administrator data access, FCM token lifecycle and the relevant public-table lockdown migration. Searched the repository for account deletion, anonymization, retention, purge and cleanup implementations.

## Executive result

**New findings: 2 (1 High, 1 Medium).** In the reviewed customer and technician API surfaces, no authenticated account-closure/deletion action was identified. The customer profile provides profile editing and logout, not account deletion. The technician dashboard logout clears local session keys, but does not perform account closure. No documented, enforceable retention schedule or scheduled purge/anonymization implementation was identified in the reviewed source/migration search.

The system has several positive controls: customer and technician API access is based on server-validated sessions; technician-data blocks protected actions for non-active technicians; the public-table lockdown migration explicitly retains retired data for audit/retention while revoking public access; and FCM has owner-scoped unregister actions. Those controls do not constitute a user-accessible deletion process or a retention policy.

## Finding F69-01 — No authenticated customer or technician account deletion/closure workflow identified

**Severity: High**

The reviewed `customer-data` action switch exposes account/profile data and other customer operations, but no delete-account, close-account, export-and-erase or anonymization action was found. `CustomerProfile.tsx` exposes logout and profile editing, not account deletion. The reviewed `technician-data` function exposes account/jobs/financial/notification data and gates actions based on technician status; no self-service account deletion or closure action was found. Technician dashboard logout only removes local session-storage keys and navigates to the login page.

The reviewed admin-data actions include technician and booking administration, but no evidenced, documented account-erasure workflow was identified in this pass. A status change to inactive/rejected/suspended is not equivalent to deletion or anonymization.

**Impact:** Users have no evidenced in-product route to request account closure and associated personal-data handling. Personal information can remain in customer/technician rows, bookings, reviews, support records, KYC storage and device-token associations without a clearly defined closure workflow. Applicable legal obligations and contractual retention exceptions must be assessed by the business; this audit does not make a legal determination.

**Remediation:**
1. Implement authenticated account-closure request and status tracking for customers and technicians.
2. Define which data is deleted, anonymized, retained for statutory/accounting/dispute purposes, or retained temporarily for active bookings.
3. Require re-authentication or step-up verification for destructive requests.
4. Revoke all role sessions and FCM device associations as part of the closure workflow; make failures visible and retryable.
5. Prevent new bookings, job assignment, wallet/payout operations and notification delivery once closure is accepted.
6. Record an immutable audit event containing actor, request, decision, timestamps and retention exception codes, without duplicating unnecessary sensitive payloads.
7. Add tests for ownership, active bookings, outstanding payments/refunds, KYC documents, support/dispute records, repeat requests and partial failures.

## Finding F69-02 — No enforceable data-retention and anonymization schedule identified

**Severity: Medium**

The repository search and reviewed migration history did not identify a comprehensive retention schedule or automated purge/anonymization worker for customer and technician personal data, historical bookings, support messages, OTP/session records, KYC objects, FCM tokens or notification history. The 2026-10-10 public-table lockdown migration explicitly says retired student/enrollment/payment tables are kept for audit/retention, but it does not define a retention duration or deletion criteria. The migration revokes public access; access restriction is not data minimization or retention enforcement.

The customer and technician authentication handlers create expiring sessions and check expiry when authenticating. Expiry checks prevent expired sessions from authorizing requests, but the reviewed code does not establish periodic deletion of expired session rows. Customer logout deletes the supplied session row but does not check the delete error before returning success (previously recorded in Audit 57). Technician dashboard logout clears browser keys without server-side session revocation (also previously noted in earlier auth/session audits).

**Impact:** Personal data and expired credential records may persist indefinitely unless another unreviewed operational process removes them. This increases breach impact and makes data-subject requests and retention compliance difficult to evidence.

**Remediation:**
- Create a data inventory and retention matrix by table, storage bucket and data category, with owner, purpose, retention period, legal hold/exception and disposal method.
- Implement scheduled, monitored cleanup for expired OTPs and sessions, obsolete FCM tokens, expired temporary uploads and eligible records.
- Use irreversible anonymization where historical booking/accounting records must be retained; preserve referential integrity and audit requirements.
- Define KYC storage deletion and signed-URL revocation on approved closure, subject to legal hold.
- Produce a deletion/anonymization receipt and a failure queue for records that cannot be removed automatically.
- Verify backups, exports, logs and third-party processors are included in retention and deletion procedures.

## Positive controls observed

- `customer-data` resolves customer identity from the server-side customer session and rejects missing/expired sessions.
- `technician-data` resolves technician identity from the server-side technician session and blocks protected operations when the technician status is not active.
- Customer logout has a server endpoint that attempts to delete the provided customer session row.
- Technician session records have an expiry timestamp checked by technician-data authentication.
- FCM data function exposes owner-scoped `unregister` and `unregister_user` actions; account closure should reuse these rather than leaving token associations active.
- Migration `20261010094000_close_public_table_access.sql` states that selected retired tables are retained for audit/retention while direct public client access is revoked. This is an access-control measure, not a retention schedule.

## Carry-forward items — not counted as new

- Customer logout does not check the session-row delete error before returning success: Audit 57.
- Technician logout does not revoke the server session: earlier technician authentication/session audits.
- FCM token associations are not consistently revoked on logout and account switching: Audit 68.
- Historical customer/technician PII in booking and operational records, and missing privacy/retention governance, were already raised in Audit 38. Audit 69 focuses on the absence of an account-closure workflow and an implementable retention schedule in the current reviewed surfaces.

## Verification limits

This is a source-code and migration-history review of the named branch. It does not prove that no manual, legal, support-led or external operational process exists. No production database, storage inventory, backup retention settings, scheduled jobs, external processor records or live account deletion request was inspected. No SQL, database changes, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed.

## Release decision

**NOT PRODUCTION READY.** Add a verified customer/technician account-closure workflow and an enforceable retention/anonymization programme, including session and device-token cleanup. Confirm legal retention exceptions with qualified counsel before deleting records required for accounting, safety, fraud prevention or active disputes.
