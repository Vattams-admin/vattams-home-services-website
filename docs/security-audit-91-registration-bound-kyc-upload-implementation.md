# Registration-Bound Technician KYC Upload — Implementation Record

Date: 2026-11-01

Branch: `security/frontend-backend-contract-audit-2026-10-31`

Repository: `Vattams-admin/vattams-home-services-website`

## Scope

This change replaces direct anonymous browser uploads of Aadhaar, PAN, and driving-licence documents with a short-lived registration-draft capability and a server-side Edge Function upload path. It is repository-only work; no production Edge Function, Storage policy, object, or Cloudflare deployment was changed.

## Implemented in the branch

### Edge Function: `supabase/functions/technician-auth/index.ts`

- Added `start-kyc-upload-session`.
  - Validates mobile and email formats.
  - Creates a random UUID draft identifier.
  - Generates a 256-bit upload capability.
  - Stores only the SHA-256 capability hash in `otp_codes.code`.
  - Limits new upload sessions to three per mobile number per hour.
  - Expires the session after 30 minutes.
- Added `upload-kyc-document`.
  - Accepts multipart upload requests.
  - Requires the mobile number, draft capability, and one of `aadhaar`, `pan`, or `dl`.
  - Rejects files over 5 MB.
  - Checks file signatures for JPEG, PNG, WebP, and PDF, and rejects MIME/signature mismatches.
  - Uploads through the service-role Edge Function into the private `technician-docs` bucket.
  - Uses an unpredictable draft UUID path and one fixed object key per document type.
  - Uses create-only uploads; no overwrite is allowed.
- Registration OTP creation now validates the upload capability, confirms the draft email, checks that Aadhaar and PAN exist in the private bucket, and derives the stored KYC object paths server-side rather than trusting client-supplied paths.
- Successful registration removes the upload-session row.
- Capability responses use `Cache-Control: no-store`.

### Frontend

- `src/lib/technicianRegistration.ts` now obtains a draft capability and routes private KYC documents to `technician-auth/upload-kyc-document`.
- The capability is held in tab-scoped `sessionStorage`, not copied into the persistent registration draft.
- KYC file size validation is aligned to the 5 MB server limit.
- Registration submission includes the capability so the server can bind the uploaded documents to the email OTP flow.
- `src/pages/TechnicianRegister.tsx` passes the email into the upload flow and clears the capability on start-over and successful registration.
- Profile photos remain in the separate public `technician-photos` bucket; their existing upload path was not redesigned in this change.

### Storage policy migration

`supabase/migrations/20261101090000_revoke_legacy_technician_kyc_storage_policies.sql`

- Sets `technician-docs` private.
- Drops all six broad policy names confirmed in the production audit, plus the legacy anonymous SELECT policy name.
- Does not recreate browser-role KYC access.
- Does not delete, move, or rewrite existing objects.

## Verification performed

- Fetched all changed source files back from the target branch after commits.
- Static assertions confirmed:
  - one Edge Runtime import remains;
  - multipart upload routing occurs before JSON parsing;
  - capability hash storage is present;
  - file-signature validation is present;
  - private Storage upload is server-side;
  - one object key is used per document type;
  - email OTP creation validates the upload draft;
  - frontend calls the new upload action and submits the capability;
  - the migration exists in the branch.
- Confirmed the live `technician-auth` function is still deployed as version 12. The branch changes are not deployed to Supabase.
- Cloudflare Pages created a branch preview for commit `49a96aa3b1a42dbb85e09868f6c481833827fa66`; GitHub's Cloudflare check run completed with `success` and reported `Deployed successfully`. This is a preview deployment, not a production deployment.
- GitHub Actions reported no workflow runs for the latest commit at the time of verification, so the repository CI typecheck/build result remains unavailable.
- A local `npm run typecheck`, `npm run lint`, and `npm run build` have not been run in this environment. Static checks and a successful Cloudflare preview deployment are not substitutes for those tests.
- A draft PR #52 was opened to make the work reviewable. The branch currently compares as 563 commits ahead and 32 behind `main`, with a 137-file diff; it is intentionally not merge-ready and must not be merged without reconciling the branch history and reviewing the full diff.

## Release blockers / required tests

1. Run frontend typecheck, lint, and production build.
2. Run Edge Function typecheck and local integration tests.
3. Test capability expiry, wrong mobile, wrong email, invalid token, and cross-draft upload denial.
4. Test spoofed MIME, malformed signatures, oversized files, empty files, and duplicate document uploads.
5. Test that missing Aadhaar/PAN prevents OTP creation and that client-supplied KYC paths are ignored.
6. Test that a successful OTP registration stores only server-derived private object paths.
7. Test that admins can still retrieve KYC documents through the existing short-lived signed-URL action.
8. Verify that abandoned draft objects are cleaned up only after a defined retention period; no cleanup job is included yet.
9. Keep the existing 65 KYC objects intact and reconcile them separately before any deletion or movement.
10. Confirm the deployed Storage service version and review the earlier resumable-upload advisory before considering any signed-upload alternative.

## Deployment order

1. Pass source checks and integration tests.
2. Deploy the updated `technician-auth` Edge Function.
3. Deploy the frontend that calls the new upload actions.
4. Verify the new flow end-to-end while existing Storage policies remain in place.
5. Apply the policy-tightening migration only after the new upload flow is live and verified.
6. Re-query `storage.objects` policies and confirm no anon/authenticated KYC SELECT, INSERT, or UPDATE policy remains.

## Explicitly not done

- No production Edge Function deployment.
- No production SQL or migration execution.
- No Cloudflare Pages deployment.
- No existing Storage object deletion, movement, or content inspection.
- No change to the public profile-photo upload policy.

## Consolidated branch review note

The draft PR represents the accumulated security-audit branch (audits 24–91), not only the KYC upload change. The branch comparison reports 563 commits ahead, 32 behind `main`, and 137 changed files. The complete diff and branch base must be reviewed/reconciled before merge.

A comparison of `technician-auth/index.ts` confirmed that this branch retains the stricter registration-fee settlement gate: payment status must be `success`, `verified_by` must be non-empty, and `verified_at` must parse as a valid timestamp. The current `main` version inspected during this review instead accepts `pending` or `success` based on UTR presence. Do not accidentally replace the stricter branch logic with the weaker main-branch check.

The KYC capability/upload work is still untested end-to-end. In particular, confirm the browser XHR multipart request includes a usable Content-Length header in the deployed Edge runtime; the upload endpoint currently returns HTTP 411 if that header is absent. If the deployed runtime legitimately omits it, replace this assumption with a bounded streaming/body-size enforcement strategy before release.

## Payment capability response hardening (branch-only)

A follow-on P0 code change was added to the same branch after reviewing deployed `payment-auth` v5:

- Payment creation explicitly selects the required fields and issues the `payment_action_token` only to the initiating payment flow, because the unauthenticated UTR form currently requires this scoped capability.
- Successful UTR submission atomically rotates the stored UUID capability and returns an explicit safe field list without the replacement token. The previous capability can no longer be replayed.
- Admin verification responses also use an explicit safe field list and omit `payment_action_token`.
- Payment API responses now carry `Cache-Control: no-store`.
- Frontend parsing requires the capability only for the creation response; sanitized update responses no longer require it. Admin verification relies on its existing super-admin session rather than the payment capability.
- The admin-data recursive sanitizer already removes `payment_action_token` from broad dashboard payloads on this branch.

Static source assertions passed for the above contract. These changes are not deployed. End-to-end tests must verify one-time UTR submission, replay denial, admin verification, and no token in admin/customer responses. The initial capability is still intentionally delivered once to the initiating browser; removing even that exposure requires replacing the current pre-auth UTR flow with a separately authenticated server-side confirmation process.

## Follow-on payment and CI hardening

- Added `scripts/security-contract-check.mjs` and the `npm run test:security` command. The checks assert the payment capability lifecycle, explicit response fields, no-store headers, recursive admin/customer capability sanitizers, and KYC upload binding/signature checks.
- Updated `.github/workflows/home-services-web-ci.yml` to run `npm run test:security` before TypeScript checking and the production build. The workflow also watches `scripts/**`.
- Corrected both UTR and verifier identity validation in `src/lib/payments.ts` to reject ASCII control characters. The verifier regex had been double-escaped and did not enforce the intended control-character rejection.
- GitHub currently reports no Actions workflow runs for this branch/PR, despite the PR-targeted workflow being present. Therefore the new security script has been committed but has NOT yet been executed in CI or locally. Do not report these tests as passed until a run actually completes.
- Latest branch comparison after these additions: 575 commits ahead, 32 behind `main`, 140 files changed (11,668 changed lines). This is a consolidated audit branch and must not be merged as a KYC-only change. Reconciliation of the branch base and review of the full diff remain a blocking gate.

## CI typecheck remediation (2026-11-02)

The first real security-branch CI run executed all 12 security contract checks successfully, then exposed seven pre-existing TypeScript errors in payment modal optional-token handling, customer booking amount/status typing, ES2020 invoice escaping, and technician login response narrowing. The corresponding frontend files were corrected on this branch. A fresh run against the resulting branch head is required; the earlier run remains failed and must not be treated as a successful build.
