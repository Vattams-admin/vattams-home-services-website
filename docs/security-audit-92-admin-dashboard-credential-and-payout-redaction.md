# Security Audit 92 — Admin Dashboard Credential and Payout Redaction

Date: 2026-11-02
Scope: repository branch review of `supabase/functions/admin-data/index.ts` and its browser-facing response sanitizer.

## Finding

The admin-data Edge Function uses broad technician queries in dashboard and analytics actions, including `.select("*")`. The recursive response sanitizer removed OTPs, booking/payment capabilities, and KYC object paths, but did not previously remove `password_hash` or `password_salt`, and did not mask `bank_account_number`.

A super-admin session does not justify returning password hashes to a browser. Full payout account numbers should not be included in general dashboard/list/analytics responses.

## Branch remediation

The branch sanitizer now:
- Omits `password`, `password_hash`, and `password_salt` recursively from all admin-data responses.
- Masks `bank_account_number` to its final four digits in broad responses.
- Continues to omit OTPs and booking/payment bearer capabilities.
- Continues to replace KYC object paths with boolean `has_aadhaar`, `has_pan`, and `has_dl` indicators.

Two additional CI source-contract assertions cover password-hash/salt omission and bank-account masking.

## Validation

- The previous clean CI run at `076a7db` passed `npm ci`, 12/12 security contract checks, TypeScript typecheck, and production build. That run predates this audit's sanitizer change and the two additional assertions.
- A fresh GitHub Actions run is in progress for the latest branch head. Its result must be checked before considering these changes validated.
- Cloudflare preview for the latest branch head is also in progress; preview is not production.
- No Supabase production Edge Function has been deployed or changed.

## Required follow-up

1. Test sanitizer behavior against nested arrays/objects containing `password_hash`, `password_salt`, full bank account numbers, OTPs, payment capabilities, and KYC paths.
2. Verify normal admin lists and technician analytics do not reveal credential or full payout account data.
3. If a business process needs full payout details, expose them only through a separate, narrowly scoped super-admin operation with explicit authorization and audit logging.
4. Reconcile the PR's divergent branch history before merge. The branch currently has 588 commits ahead, 32 behind `main`, and 141 changed files; GitHub reports the PR is not mergeable.

## Release status

Branch-only remediation. Production remains unchanged. Do not merge, deploy Edge Functions, or apply Storage policy migrations without the required review and separate production approval.
