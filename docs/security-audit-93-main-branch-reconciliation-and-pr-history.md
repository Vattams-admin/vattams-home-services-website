# Security Audit 93 — Main Branch Reconciliation and PR History

Date: 2026-11-02
Repository: `Vattams-admin/vattams-home-services-website`
PR: #52 — consolidated security remediations
Head at audit: `e55a7410a49b1fdbe1ae52c87e2b2ba5ea708977`

## 1. Verified history

The PR is open and draft. GitHub reports 589 commits in the PR, 142 changed files, 11,067 additions, and 1,090 deletions. The comparison against `main` reports 589 commits ahead and 32 behind, with merge base `68dc81bff721ceae536f9d5b2a8e303b29787f69` (2026-10-25).

The merge-base commit is titled "Update homepage service catalogue and harden admin wallet flows". The current `main` tip is `4697fdc37a9d179c0efb92578efb545ef1ad566a`, a merge of PR #50. The security branch's current head is `e55a7410a49b1fdbe1ae52c87e2b2ba5ea708977`.

The divergence is therefore real: `main` contains 32 commits after the merge base that are not ancestors of the security branch. The PR is not mergeable at the time of this audit.

## 2. Changes on main since the merge base

The 32-commit main-side delta changes nine paths:

1. `src/components/NotificationCenter.tsx` — 53 changed lines
2. `src/components/PaymentModal.tsx` — 83 changed lines
3. `src/components/home/Features.tsx` — 2 changed lines
4. `src/pages/AdminDashboard.tsx` — 14 changed lines
5. `src/pages/Services.tsx` — 10 changed lines
6. `supabase/functions/admin-data/index.ts` — 68 changed lines
7. `supabase/functions/technician-data/index.ts` — 16 changed lines
8. `supabase/migrations/20261010200000_customer_pump_service_price_1200.sql` — added
9. `supabase/migrations/20261025120000_restore_service_catalog_and_city_availability.sql` — added

## 3. Paths also modified by PR #52

Six paths are changed on both sides and require semantic reconciliation:

- `src/components/PaymentModal.tsx`
- `src/components/home/Features.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/Services.tsx`
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/technician-data/index.ts`

The three main-only paths are not overwritten by the PR's current changed-file set. The two SQL migrations should be retained and checked for ordering/dependency interactions with the PR's four new migrations.

## 4. Known semantic merge requirements

### PaymentModal
Main contains the latest payment UX and capability handling. PR #52 makes `payment_action_token` optional in parsed update responses. Preserve the main UI and payment behavior while keeping token handling optional for sanitized responses; only payment creation should require the one-time action token.

### Features
Main and PR both update feature messaging. Preserve the current marketplace positioning from main and avoid claiming the legacy OTP job-checkpoint flow remains available while booking OTP actions are disabled.

### AdminDashboard
Main contains assignment/notification and dashboard updates. PR #52 also changes assignment notification failure handling and reads KYC presence flags (`has_aadhaar`, `has_pan`, `has_dl`) instead of raw KYC paths. Preserve the main dashboard changes while retaining safe KYC boolean indicators and notification failure handling.

### Services
Preserve the main service catalogue and city availability behavior, alongside the marketplace title/description and premium visual updates from the security branch.

### admin-data
This is the highest-risk overlap. Main adds changes to admin dashboard actions and data operations. PR #52 adds recursive response redaction for password/hash/salt fields, bearer capabilities, KYC object paths, and bank-account masking. Merge by action and response contract, not by choosing one whole file. Retain all current main actions while ensuring every browser-facing response passes through the sanitizer.

### technician-data
Main adds technician data behavior after the merge base. PR #52 gates protected technician actions on active account status and uses atomic job transitions. Preserve main behavior while retaining session-derived technician identity and active-status enforcement. Confirm all technician actions still exist and are covered by authorization tests.

## 5. Safe reconciliation approach

Do not force-push, reset, or wholesale copy files from `main` over the security branch. Do not merge PR #52 while GitHub reports it is not mergeable.

Recommended sequence:
1. Create a separate reconciliation branch from the current `main` tip.
2. Reconstruct the security branch's final 142-file change set onto that branch, preserving the two main-only SQL migrations and NotificationCenter changes.
3. Manually reconcile the six overlapping files using the semantic requirements above.
4. Verify the resulting tree and migration ordering.
5. Run security contract tests, typecheck, production build, and Cloudflare preview.
6. Compare the clean branch against `main`; expected base divergence should be zero and the PR diff should contain only intended changes.
7. Keep PR #52 draft until the reconstructed PR has been reviewed and integration tests pass.

This audit does not create a new branch, change branch history, update `main`, merge the PR, or alter production services.

## 6. Release boundary

The latest validated CI run `41381057180` passed `npm ci`, 14/14 security contract checks, typecheck, and production build at `e55a741`. Cloudflare preview for that commit succeeded at https://9b47076e.vattams-home-services-website.pages.dev.

The preview is not production. Supabase production Edge Functions and Storage policies remain unchanged; the KYC Storage migration has not been applied. Production deployment requires separate approval.
