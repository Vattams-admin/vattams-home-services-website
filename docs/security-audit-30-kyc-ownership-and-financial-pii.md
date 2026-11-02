# Security Audit 30 — KYC upload ownership, document access and financial PII

**Date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** GitHub source/migration review only. No production database access, migrations, storage changes, or deployment.

## Executive result

**Status: BLOCKED — not production-ready.** The KYC bucket is private, browser reads are removed, anonymous overwrite is removed, and the document URL endpoint requires an active super-admin session and issues five-minute signed URLs. Those are meaningful protections. But the current anonymous upload policy only validates the shape of the object path; it does not prove the uploader owns the mobile-number folder. Registration also accepts client-supplied KYC object paths without validating that they belong to the applicant. This leaves a material ownership and document-confusion risk.

## Findings

### 1. Anonymous KYC uploads are not bound to a verified registration identity — HIGH

Migration `20261031120000_tighten_technician_kyc_upload_policies.sql` allows anon/authenticated INSERT into `technician-docs` when the object name matches `^[6-9][0-9]{9}/(aadhaar|pan|dl)\.(jpg|jpeg|png|webp|pdf)$`. It removes the anonymous UPDATE policy and anonymous SELECT policy. `src/lib/technicianRegistration.ts` uploads directly with the public anon key to `${mobile}/${docType}.${ext}`.

The migration itself documents that this is temporary and that an anon Storage request cannot prove ownership of the mobile-number folder in the current no-Supabase-Auth registration architecture.

**Impact:** an unauthenticated client can attempt to occupy another person's predictable mobile-number/document path before that person uploads. Create-only behavior blocks overwrite, but does not establish ownership and can cause document-path squatting or denial of legitimate uploads.

**Required remediation:** replace direct anonymous KYC upload with an OTP-verified, server-issued, short-lived upload capability scoped to the exact applicant, document type, object key, content type and size. Enforce one-time use and no overwrite. Do not rely on the mobile number being secret.

### 2. Registration trusts client-supplied private KYC object paths — HIGH

`technician-auth/index.ts` `handleRegister` accepts `aadhaar_url`, `pan_url`, and `dl_url` from the request and stores them on the technician row. The inspected handler verifies that the ₹49 payment is successful and belongs to the normalized mobile, but does not validate that each KYC path equals the expected `${normalizedMobile}/aadhaar|pan|dl.<allowed-extension>` object key or prove that the current registration session uploaded it.

`handleDocUrl` later reads the path from that technician row and asks the private `technician-docs` bucket to create a signed URL. It rejects legacy HTTP URLs, but the inspected code does not independently bind the object path to the requested technician's mobile number and document type.

**Impact:** a registration request can associate a different object's path with an applicant record. Because the admin document endpoint signs the stored path, a maliciously or accidentally mis-associated path can cause the admin review interface to display the wrong applicant's private document.

**Required remediation:** server-derive and persist object keys from verified registration identity; validate bucket object existence, exact mobile prefix, exact document-type filename and allowed extension; never accept arbitrary storage paths from the browser. The doc-url endpoint should repeat the ownership/path validation before signing.

### 3. Document URL access is strongly role-gated but relies on path integrity — MEDIUM

`handleDocUrl` checks an unexpired admin session and requires `role=super_admin` and `is_active=true`. It creates a 300-second signed URL from the private bucket. The bucket has no browser SELECT policy in the inspected hardening migration.

This limits direct access, but signed-URL authorization is only as reliable as the stored path association described above. Five-minute expiry does not fix incorrect object ownership.

**Required remediation:** retain the super-admin check and short expiry; add path/object ownership validation; avoid logging signed URLs; audit access events with admin ID, technician ID, document type and timestamp (never the URL or document contents).

### 4. Admin technician and customer APIs return broad database rows — MEDIUM

`admin-data/index.ts` requires an active super-admin session. Its `technicians`, `customers`, and `bookings` actions use `select("*")`. The recursive response sanitizer strips OTPs and action tokens and replaces KYC object paths with boolean `has_aadhaar`, `has_pan`, and `has_dl` flags. This prevents KYC storage paths from leaving the function.

However, the sanitizer does not mask bank account number, IFSC, UPI ID, identity proof number, or other financial/identity fields. The super-admin-only gate is a useful control, but broad select-star responses violate least-data principles and make any future authorization regression more damaging.

**Required remediation:** define explicit response DTOs per dashboard action; return bank details only through a separate privileged payout workflow; mask account numbers by default; omit identity numbers and other nonessential sensitive fields. Keep KYC presence booleans rather than object paths.

### 5. Technician-facing account payload excludes bank payout fields — positive control

`technician-data/index.ts` account action selects a bounded technician field list that does not include bank account number, IFSC, bank holder name or UPI ID. It scopes jobs, wallet transactions, recharges and notifications to the authenticated technician ID. The technician auth session is checked for expiry and the technician account must be active for protected actions.

This is a positive control in the reviewed code. It does not eliminate the admin API's broad data exposure or KYC upload ownership gap.

## Changes made

No runtime code or SQL migration was changed in this audit. Fixing anonymous upload ownership safely requires a coherent server-issued upload-capability flow and frontend registration changes; changing only the Storage policy would break the existing registration upload flow or leave the ownership gap intact.

Added this report to the existing security branch. PR #51 was already merged by GitHub into `feat/royal-corporate-premium-homepage` before this audit; this audit did not merge or deploy anything. No changes were made to `main`.

## Validation limits

- Retrieved and inspected the current security-branch versions of technician-auth, technician-data, admin-data, technicianRegistration, and KYC Storage policy migration.
- No Deno typecheck, frontend build, Storage policy simulation, adversarial upload test, signed-URL integration test, PostgreSQL/RLS verification, or production database inspection.
- No migration was applied and no deployment was performed.

## Release gates

1. Implement OTP-bound, server-issued, one-time KYC upload capabilities.
2. Reject arbitrary KYC paths at registration; derive object keys server-side.
3. Revalidate technician/mobile/document-type path ownership before generating signed URLs.
4. Keep private bucket browser SELECT denied and anonymous overwrite denied.
5. Replace admin `select("*")` for technicians/customers/bookings with explicit least-privilege DTOs; mask financial and identity fields.
6. Add tests for cross-mobile upload attempts, path substitution, object-key squatting, expired/replayed upload capabilities, unauthorized document URL requests, and admin response field allowlists.

**Audit 30 conclusion:** private bucket reads and super-admin signed URLs are positive controls, but KYC upload ownership and registration path integrity remain high-severity release blockers. Admin API financial/identity data minimization also remains incomplete.