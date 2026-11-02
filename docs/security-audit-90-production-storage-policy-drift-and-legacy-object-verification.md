# Security Audit 90 — Production Storage Policy Drift and Legacy Object Verification

**Audit date:** 2026-11-01  
**Repository:** `Vattams-admin/vattams-home-services-website`  
**Repository branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Source baseline:** `dbba5f9d27cee7ed3ec43db72aaf6d7a25635303`  
**Supabase project:** `nfcibyprftnowaiwlxxc` (marketplace project reference found in repository configuration)  
**Method:** Read-only inspection of live Supabase Storage metadata, effective `storage.objects` policies, migration history, aggregate object metadata and deployed Edge Function source. No writes or policy changes.

## Executive result

<em>Release status: NOT PRODUCTION READY — critical live policy drift confirmed.</em>

The production KYC bucket is marked private, but the effective live RLS policy set still permits `anon` and `authenticated` roles to SELECT, INSERT and UPDATE objects in `technician-docs`. Several simultaneously active permissive policies grant bucket-wide access, so the private bucket flag does not provide the intended KYC confidentiality boundary. The 31 October policy-tightening migration is not recorded in the live migration history.

The live profile-photo bucket is public and has anonymous/authenticated INSERT and UPDATE policies. Its public read configuration may be intentional, but public writes are not owner-bound.

The production database currently reports zero rows in `technicians`, `technician_applications` and `technician_documents`, while Storage contains 65 KYC-bucket objects and 15 profile-photo objects. This means the existing object inventory cannot be reconciled to current technician/application records. It is not evidence that the files are harmless or that no legacy URL exposure exists.

## 1. Live bucket configuration

Read-only query of `storage.buckets` returned:

| Bucket | Public flag | Size limit | Allowed MIME metadata |
|---|---:|---:|---|
| `technician-docs` | false | 10 MiB | JPEG, PNG, WebP, PDF |
| `technician-photos` | true | 10 MiB | JPEG, PNG, WebP |

**Interpretation:** The KYC bucket's public flag is correctly false. However, access to private-bucket objects is also governed by Storage RLS. The policies below independently grant browser roles access and defeat the intended private-read boundary.

## 2. Critical live KYC policy drift

The live `pg_policies` result contains these policies on `storage.objects`:

| Policy | Command | Roles | Effective predicate |
|---|---|---|---|
| `technician_docs_select` | SELECT | anon, authenticated | bucket_id = technician-docs |
| `technician_docs_upload` | INSERT | anon, authenticated | bucket_id = technician-docs |
| `Allow technician document uploads` | INSERT | anon, authenticated | bucket_id = technician-docs |
| `anon_insert_technician_docs` | INSERT | anon, authenticated | bucket_id = technician-docs |
| `anon_update_technician_docs` | UPDATE | anon, authenticated | bucket_id = technician-docs |
| `technician_docs_update` | UPDATE | anon, authenticated | bucket_id = technician-docs |

These are broad bucket-level predicates. The live SELECT policy allows browser roles to request KYC objects from a bucket whose public flag is false. Three separate INSERT policies permit any object name in the bucket, and two UPDATE policies permit bucket-wide updates. PostgreSQL permissive policies combine by OR for applicable commands; adding a restrictive policy does not neutralize these broad permissive policies.

**Finding F90-01 — CRITICAL: Live KYC SELECT is granted to anonymous and authenticated browser roles.**

This is a live configuration finding, not merely a source-level concern. A private bucket with an anonymous SELECT RLS policy does not meet the intended KYC confidentiality boundary. The review did not retrieve or expose any actual KYC file contents, and did not perform an unauthenticated HTTP download test. Nevertheless, the live policy itself authorizes the browser role at the database policy layer.

**Finding F90-02 — HIGH: Live KYC INSERT and UPDATE policies bypass the latest restricted upload design.**

The live INSERT predicates only check the bucket ID. They do not enforce the mobile/document filename regex from the 31 October migration, verified registration ownership, or create-only semantics. UPDATE is still granted by two bucket-wide policies. This defeats the source migration's intended removal of anonymous overwrite.

## 3. Migration history mismatch

The live migration history ends with the 25 October 2026 service-catalogue/city-availability migrations. It does not contain:

`20261031120000_tighten_technician_kyc_upload_policies`

Therefore, the latest source migration reviewed in Audit 89 is not applied to this connected production database. The observed live policies are consistent with older permissive migrations still being active.

This confirms repository-source hardening and deployed database configuration have diverged. A successful GitHub commit or source fetch-back does not apply a Supabase migration.

## 4. Live profile-photo policies

The live policy list also confirms:

- `anon_select_technician_photos`: SELECT to anon/authenticated for all objects in `technician-photos`.
- `anon_insert_technician_photos`: INSERT to anon/authenticated for all objects in the bucket.
- `anon_update_technician_photos`: UPDATE to anon/authenticated for all objects in the bucket.

**Finding F90-03 — HIGH: Public profile-photo bucket still allows bucket-wide anonymous writes and updates.**

Public reads may be required for public technician profiles, but the current policies do not bind uploads or replacements to a verified technician. The profile-photo upload boundary remains unsafe.

## 5. Live object inventory and record reconciliation

Read-only aggregate counts:

| Source | Count |
|---|---:|
| Rows in `public.technicians` | 0 |
| Rows in `public.technician_applications` | 0 |
| Rows in `public.technician_documents` | 0 |
| Objects in `technician-docs` | 65 |
| KYC objects matching expected mobile/document/extension key shape | 56 |
| KYC objects not matching that expected key shape | 9 |
| Objects in `technician-photos` | 15 |

Storage metadata reports 7 PDF MIME values and 58 image MIME values in the KYC bucket, and 15 image MIME values in the photo bucket. These are metadata claims, not file-signature verification.

The technician table query returned zero rows, so legacy URL counts are also zero because there are no technician rows to inspect. This must not be interpreted as proof that legacy URLs or old public copies do not exist. The 65 KYC objects cannot be correlated with current technician/application/document rows from the inspected tables. Nine KYC object names do not match the expected key convention and require controlled inventory and classification.

**Finding F90-04 — HIGH: KYC object inventory cannot be reconciled to technician records.**

There are 65 stored KYC objects but no rows in the three inspected technician/application/document tables. Object ownership, retention basis, applicant association and whether any objects are stale or abandoned remain unverified. Do not bulk-delete or expose these objects during investigation.

## 6. Deployed Edge Function drift

The active `technician-auth` Edge Function is version 12, with `verify_jwt=false` and its own request-level authentication logic. The deployed source was retrieved read-only.

A comparison against the reviewed repository source baseline shows a registration payment validation mismatch:

- The deployed function accepts payment status `pending` or `success`, and checks for a UTR.
- The reviewed repository source requires `status = success`, a non-empty `verified_by`, and a valid `verified_at` timestamp.

**Finding F90-05 — HIGH: Deployed technician registration function is weaker than the reviewed source contract.**

This is an adjacent production drift finding. The active deployed function does not enforce the stronger payment verification contract present in the reviewed repository source. This audit did not call the function or attempt registration.

## 7. Verification boundaries

Performed:
- Read-only Supabase project discovery and project-ref match against repository configuration.
- Read-only `storage.buckets` inspection.
- Read-only complete `pg_policies` inspection for `storage.objects`.
- Read-only Supabase migration history inspection.
- Read-only aggregate object metadata and table row counts.
- Read-only retrieval of deployed `technician-auth` Edge Function version and source.

Not performed:
- No Storage object downloads or disclosure of object names/PII.
- No unauthenticated HTTP read/upload/overwrite penetration test.
- No file signature inspection, malware scan or content parsing.
- No production data or object mutation.
- No SQL DDL, migration application, policy change, Edge Function deployment, build, workflow, Cloudflare deployment or merge.

## 8. Required release gates

1. Remove every broad browser-role SELECT, INSERT and UPDATE policy on `technician-docs`; retain no anon/authenticated SELECT access to KYC objects.
2. Replace anonymous KYC writes with a verified, mobile-bound, short-lived upload capability. Do not rely on an object-name regex as ownership proof.
3. Remove bucket-wide anonymous photo INSERT/UPDATE; implement owner-bound writes while preserving public read only if product requirements demand it.
4. Reconcile all 65 KYC objects and 15 photo objects against authoritative applicant/technician records. Classify the 9 nonconforming KYC keys and establish retention/ownership before any cleanup.
5. Verify legacy public URLs and cache exposure through a controlled, non-disclosing test plan.
6. Align the deployed `technician-auth` function with the reviewed payment verification contract; verify its deployment/version after separately authorized remediation.
7. Re-query effective live policies and migration history after remediation, then run controlled staging tests for anonymous SELECT/INSERT/UPDATE denial and authorized admin signed-link access.

## Conclusion

**Production remains NOT PRODUCTION READY.** Audit 90 confirms that the live KYC Storage policies do not match the tightened source migration: anonymous KYC SELECT, INSERT and UPDATE remain granted. Public profile-photo writes remain broad, the stored object inventory cannot be linked to current technician records, and the deployed registration function is weaker than the reviewed source contract.

No production changes were made. These findings require a separately authorized remediation plan and post-change verification.
