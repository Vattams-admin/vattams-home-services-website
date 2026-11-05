# Investigation 321 — Supabase Migration Version Integrity

Date: 2026-11-05  
Repository: `Vattams-admin/vattams-home-services-website`  
Base: `main` at `7ea6d345fcf9e78cc3dae6b38be2b2266c6cb66a`

## Confirmed defects

A repository-wide scan of all 92 SQL migration filenames found two duplicate 14-digit versions:

- `20261025120000`: technician email registration OTP and service catalogue/city availability migrations.
- `20261104150000`: atomic technician notification read-all and technician registration-payment activation migrations.

Duplicate versions make local migration ordering ambiguous and can prevent reliable migration application.

## Corrections in PR #180

1. Renamed technician registration-payment activation migration to `20261105190000_enforce_technician_registration_payment_activation.sql`. Its SQL body is unchanged. The live migration history did not show this migration as applied.
2. Renamed service catalogue/city availability migration to `20261025053501_restore_service_catalog_and_city_availability.sql`, matching the already-applied production migration version/name. A read-only query of `supabase_migrations.schema_migrations` returned this exact version/name and stored SQL statements matching the source migration's DDL, policy, seed and index operations.
3. Updated `scripts/registration-payment-activation-migration-check.mjs` to reference the renamed activation migration.
4. Extended `scripts/migration-history-contract-check.mjs` to require every SQL migration filename to have a 14-digit prefix and to fail if any version is duplicated.

## Verification evidence

- Source scan: 92 migration files; after corrections, no duplicate 14-digit versions were found.
- Production migration history was queried read-only. The service catalogue migration exists as version `20261025053501`; the registration-payment activation migration `20261105190000` is not yet applied.
- PR #180 migration contract: passed on head `be89d20cdc93a65eb9fc7694381205d55cec67f2`.
- PR #180 registration-payment activation migration contract: passed on the same head.
- PR #180 ESLint: passed on the same head.
- Full Web CI was still in progress at the initial checkpoint; its migration-history step subsequently failed on the second duplicate version, which this follow-up rename corrects. Full CI must pass on the final PR head before merge.
- No production migration, database DDL, Edge Function deployment, Storage policy mutation, or customer data change was performed.

## Production observations (read-only)

- `technician-docs` is private and no browser-role Storage policies were returned for that bucket in the current policy query.
- `technician-photos` remains public and has broad `anon, authenticated` INSERT and UPDATE policies. This is a separate security remediation requiring a verified server-side upload path; simply dropping the policies would break current registration photo uploads.
- `technician-auth` is deployed at version 16 and the retrieved source enforces the verified ₹49 registration-payment requirements (`status=success`, non-empty `verified_by`, valid `verified_at`).
- The notification push retry worker and its migration are still not deployed to production.

## Release decision

PR #180 is a repository migration-integrity correction. Merge only after all required GitHub Actions checks pass on its final head. Production remains not certified: the profile-photo write boundary and notification retry rollout remain outstanding, as do other lifecycle and payment end-to-end release gates.
