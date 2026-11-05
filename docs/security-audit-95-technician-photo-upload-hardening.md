# Investigation 322 — Technician Profile Photo Upload Hardening

Date: 2026-11-05  
Repository: `Vattams-admin/vattams-home-services-website`  
Base: `main` after PR #180 merge (`b65adca90fb9749ea1b77737d532e1fc2a540111`)

## Live defect confirmed

The connected production `technician-photos` bucket is public-read, but the effective `storage.objects` policy query returned broad `anon, authenticated` INSERT and UPDATE policies:

- `anon_insert_technician_photos`
- `anon_update_technician_photos`

The registration frontend uploaded profile photos directly to the Storage REST object endpoint using the public anon key and a mobile-number-derived object path. That bypassed registration-draft capability ownership.

Public reads are retained because profile photos are displayed in technician/customer marketplace UI. Browser-role writes are the unsafe boundary.

## Repository correction proposed in PR #181

- Route profile photo uploads through the existing `technician-auth/upload-kyc-document` Edge Function and the same short-lived, mobile/email-bound registration draft capability used for KYC documents.
- Validate image signatures and reject PDF content for profile photos.
- Write profile photos server-side using the service role into `technician-photos` under an unpredictable draft UUID path.
- Return a server-generated public URL and derive `profile_photo_url` from the validated draft at registration time; client-supplied profile-photo URLs are overridden by the server-derived draft result.
- Preserve create-only uploads for Aadhaar/PAN/DL; permit replacement only for the draft-bound profile photo.
- Remove the browser direct Storage upload path from the registration client.
- Add migration `20261105200000_restrict_technician_photo_browser_writes.sql` to drop the two live broad INSERT/UPDATE policies without removing public SELECT.
- Add `test:technician-photo-upload` and include it in Home Services Web CI.

## Safety and rollout boundary

The source change and migration are proposed for review only. No production migration, Storage policy mutation, Edge Function deployment, customer/technician data mutation, or photo-object deletion was performed.

Deployment order must be: pass CI; deploy the updated `technician-auth` Edge Function; deploy the matching frontend; test a fresh registration and photo replacement; then apply the policy migration; finally re-query effective policies and confirm browser INSERT/UPDATE are denied while public SELECT still works.

Existing photo objects and their URLs are not changed by this migration.

## Validation

PR #181 must pass the new photo-upload contract, full security and migration-history checks, typecheck, production build, ESLint, and relevant PostgreSQL tests before merge. Production readiness remains uncertified until deployment and live policy verification are completed.
