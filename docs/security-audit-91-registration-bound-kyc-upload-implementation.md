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
- Confirmed the live `technician-auth` function is still deployed as version 12. The branch changes are not deployed.
- No GitHub Actions workflow run was available for the latest commit.
- A local `npm run typecheck`, `npm run lint`, and `npm run build` have not been run in this environment. Static checks are not a substitute for those tests.

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
