# Security Audit 60 — Technician Profile, Bank Details, UPI Data and Sensitive Personal Information Access Controls

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed the technician self-service API, technician registration draft persistence, technician dashboard profile response, administrator technician-list and analytics responses, and shared technician data types. Focus areas: bank account number, IFSC, account-holder name, bank name, UPI ID, personal contact data, wallet records, and least-privilege field exposure.

## Executive result

- **New findings: 0**
- Several material data-minimization and browser-storage concerns remain visible in the current source, but they overlap findings already recorded in Audits 38 and 40.
- The technician self-service account response does not currently select bank-account or UPI fields.
- The administrator API continues to return broad technician records, including fields not required by every dashboard view.

## Controls observed

### Technician self-service account API

The `technician-data` Edge Function:
- Validates the supplied session token against `technician_auth_sessions` and checks expiry.
- Derives the technician ID from the server-side session record; it does not trust a client-supplied technician ID for the account query.
- Checks the current technician status before protected actions.
- Uses an explicit field list for the technician account response. The list includes profile/contact, service, status and wallet summary fields, but does not include `bank_account_number`, `bank_ifsc`, `bank_name`, `bank_holder_name`, or `upi_id`.
- Scopes job history, wallet transactions, wallet recharges and notifications to the session-derived technician ID.

This is a positive least-privilege boundary for the technician's own dashboard response. The wallet/recharge tables still use `select("*")`, but are filtered to the authenticated technician; field minimization remains advisable.

### Registration draft persistence

The registration helper deliberately omits the password before saving a resumable registration draft. It stores the remaining form object in browser localStorage. That form includes bank account number, IFSC, bank name, account-holder name and UPI ID, as well as other personal and registration details. This is an existing browser-storage concern from Audit 40 and is carried forward rather than recounted.

### Administrator API

The `admin-data` function requires a valid, unexpired admin session and confirms the account is active with role `super_admin`. However:
- The `technicians` action selects `*` and returns the records through a sanitizer.
- The `analytics_technician_performance` action also selects all technician columns and returns the technician object.
- The sanitizer removes selected bearer/OTP fields and converts KYC object paths to boolean presence indicators, but does not remove bank account number, IFSC, account-holder name, bank name or UPI ID.

This is an overbroad sensitive-data response, but it duplicates the previously recorded administrator data-minimization issue.

## Carry-forward items — not counted again

### C60-01 — Sensitive registration draft values persisted in localStorage

**Original finding:** Audit 40.  
`saveRegistrationDraft` removes only the password before serializing the rest of the registration form to localStorage. The form schema includes bank account number, IFSC, bank name, account-holder name and UPI ID. Any script executing in the page origin can potentially read these values. The password exclusion is a positive control but does not make the remaining financial identifiers appropriate for persistent browser storage. Prefer not persisting bank/UPI fields, or use a safer server-side draft design after verifying identity.

### C60-02 — Broad administrator technician records include financial identifiers

**Original findings:** Audits 30 and 38.  
The technician list and technician performance analytics use `select("*")`. The current sanitizer removes KYC object paths but leaves bank and UPI fields in the returned technician object. The endpoint is restricted to active super_admin sessions, which reduces the audience but does not satisfy field-level minimization. Return explicit columns per admin screen and expose payout identifiers only through a narrowly scoped, audited workflow.

### C60-03 — Wallet/recharge responses use wildcard field selection

The technician self-service endpoint uses `select("*")` for wallet transaction and recharge records, though each query is scoped by the authenticated technician ID and bounded by a result limit. No direct cross-technician access was evidenced in the reviewed source. Replace wildcard selection with explicit fields to prevent future schema additions from silently expanding the response.

## Remediation priorities

1. Remove bank account number, IFSC, account-holder name, bank name and UPI ID from browser-persisted registration drafts; clear legacy drafts after a safe migration/notice.
2. Replace administrator technician `select("*")` calls with explicit screen-specific field lists.
3. Create a separate, permission-checked payout-details view for only staff who need it; record access events for sensitive financial identifiers.
4. Replace wallet/recharge wildcard selects with explicit response schemas and test that future sensitive columns cannot leak.
5. Review logs, error telemetry and client analytics to ensure bank/UPI values are not captured.
6. Document retention and deletion rules for technician financial details and registration drafts.

## Verification limits

This is a source-code review of the named branch only. No live API response, browser storage, administrator role, database schema, RLS policy, payout workflow, or production data was inspected or tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. The report does not prove deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** Close the carried-forward localStorage and administrator data-minimization issues, and enforce explicit field-level response contracts for financial identifiers.
