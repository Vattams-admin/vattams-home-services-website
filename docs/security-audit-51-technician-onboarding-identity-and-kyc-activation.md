# Security Audit 51 — Technician Onboarding, Identity Verification and KYC Activation

Audit date: 2026-10-31
Branch: security/frontend-backend-contract-audit-2026-10-31
Method: Read-only source review. No live applicant records, production database, storage objects or deployed endpoints were accessed.

## Executive result

**NOT PRODUCTION READY.**

The onboarding code requires email OTP, a ₹49 payment record marked successful with administrator verification metadata, creates new technician rows as pending, and blocks protected technician actions until the account is active. Private KYC document retrieval requires an active super-admin session and issues five-minute signed URLs.

Two source-level gaps remain: the registration flow verifies the email address but does not verify control of the submitted mobile number; and the admin activation action can set a technician active without checking for completed KYC review evidence.

## Findings

### F51-01 — HIGH: Registration does not verify ownership of the submitted mobile number

**Evidence**
- In supabase/functions/technician-auth/index.ts, startTechnicianRegistrationOtp sends the registration OTP to the submitted email address.
- The OTP record is keyed by the submitted mobile and technician_registration purpose, but delivery is email-based.
- verifyTechnicianRegistrationOtp calls handleRegister after successful email OTP verification.
- handleRegister checks the ₹49 registration payment row, matching payee mobile, UTR, success status and administrator verification metadata.
- The inserted technician record explicitly sets mobile_verified=false. No mobile OTP or other mobile-control verification is performed in this registration flow.

**Risk**
A technician account can be created with a mobile number that has not been verified as controlled by the applicant. A payment row associated with that number does not establish control of the mobile channel.

**Remediation**
- Verify the submitted mobile through a one-time code delivered to that number before account creation or activation.
- Bind email and mobile verification to one registration-attempt identifier and expiry.
- Store separate email and mobile verification timestamps and enforce the required evidence before activation.
- Test changed mobile numbers, replay, expiry and concurrent verification.

### F51-02 — HIGH: Technician activation does not enforce a completed KYC review

**Evidence**
- In supabase/functions/admin-data/index.ts, technician_status accepts active, inactive, rejected or suspended.
- For active, the handler clears rejection_reason and suspend_reason and directly updates the technician row.
- The registration handler accepts aadhaar_url, pan_url and dl_url as optional and persists missing values as null.
- The activation action does not check required document presence, per-document review status, reviewer identity, review timestamp or an approved KYC decision.
- The technician-auth document retrieval action checks an active super-admin session, restricts document types, rejects legacy public URLs and issues a signed URL for 300 seconds. It provides access for review but does not record the review decision.

**Risk**
The in-product activation endpoint can make an account active without proving that required documents have been submitted and reviewed. An external/manual process may exist, but it is not enforced by the reviewed repository path.

**Remediation**
- Introduce explicit KYC review states and per-document decisions.
- Make activation an atomic server-side operation requiring all mandatory documents to be present and approved.
- Record reviewer, timestamp, document version, decision and reason in an immutable audit event.
- Prevent direct status updates from bypassing the approval operation.
- Test that missing, rejected, replaced or unreviewed documents cannot be activated.

## Positive controls

1. Direct register action returns HTTP 403; registration uses send-registration-otp and verify-registration-otp.
2. Email OTP expires after ten minutes and has a five-attempt verification cap.
3. OTP attempt increments use increment_otp_attempt_count.
4. OTP consumption is conditional on verified=false.
5. Registration checks matching mobile, exact ₹49 amount, registration_fee purpose, UTR, success status and administrator verification metadata.
6. New technician accounts start as pending.
7. Registration sets profile_score=0 and mobile_verified=false rather than trusting client values.
8. technician-data rechecks account status and blocks protected actions unless active.
9. Private KYC retrieval requires an active super-admin session, fixed document-column allowlist and five-minute signed URLs.
10. admin-data removes KYC object paths from broad dashboard responses and exposes presence indicators instead.

## Prior findings not recounted

- Audits 30 and 41 cover KYC storage ownership, public technician-photo writes, client-only file validation and legacy document URLs.
- Audits 29 and 34 cover registration-payment ownership, payment capability and UTR settlement evidence.
- Audit 38 covers broader personal-data consent, retention and erasure.
- Audits 32 and 47 cover technician sessions and role boundaries.

## Verification limits

No live applicant or KYC record was accessed. No SMS/email provider, signed URL, production database, deployed Edge Function or effective Storage policy was tested. No build, test, SQL, migration, deployment, GitHub Actions run or merge was performed.

## Release gates

1. Verify mobile ownership and bind it to the registration attempt.
2. Add auditable per-document KYC review and require approval before activation.
3. Replace direct activation updates with a guarded atomic approval operation.
4. Keep payment settlement separate from identity verification.
5. Test OTP replay, changed mobile, missing/rejected documents and concurrent activation.
6. Verify deployed storage policies and function versions before release.

**Conclusion:** Email OTP, pending initial status, payment verification metadata and private document retrieval are present. Verified mobile ownership and an enforced KYC review gate before activation are not demonstrated. The marketplace remains NOT PRODUCTION READY.
