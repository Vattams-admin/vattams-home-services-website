# Security Audit 84 — Environment Variables, Exposed Secrets and Production Configuration Boundaries

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only repository configuration and selected source review  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**1 new finding (LOW).** The root `.gitignore` excludes a file named exactly `.env` and files matching `*.local`, but it does not exclude Vite's common mode-specific environment filenames such as `.env.production`, `.env.development`, `.env.staging`, or their `.env.*.local` variants (the latter are already covered by `*.local`). A developer could accidentally commit a production environment file containing server-side credentials unless repository-level secret scanning or other controls catch it.

No server-side service-role key or provider private key was confirmed in the selected frontend configuration files. The Supabase anon-role key and Firebase web configuration are intentionally public client configuration and are not classified as secrets in this audit.

## Scope and evidence reviewed

- Root `.gitignore`
- `package.json`
- `vite.config.ts`
- `src/lib/supabase.ts`
- `src/lib/firebase-config.ts`
- `public/firebase-messaging-sw.js`
- `.github/workflows/deploy-supabase-production.yml`
- Prior reports 39 and 43 for established secret-boundary and deployment controls.

The repository tree was inspected for environment/configuration filenames. No root `.env` or `.env.production` file appeared in the tree listing. This review is not a complete Git-history scan or exhaustive secret-scanning certification.

## Finding

### F84-01 — LOW: Mode-specific Vite environment files are not comprehensively excluded by .gitignore

**Evidence**
- Root `.gitignore` contains `.env`, which matches the exact filename `.env`.
- It also contains `*.local`, which excludes files ending in `.local`, including `.env.local` and `.env.production.local`.
- It does not contain a general `.env.*` ignore pattern.
- Vite's `vite.config.ts` calls `loadEnv(mode, process.cwd(), '')`, loading all environment-variable prefixes for the selected mode into the build configuration.
- Vite mode-specific environment files commonly use names such as `.env.production` and `.env.development`. Such files are not covered by the exact `.env` ignore entry or the `*.local` pattern.
- The inspected repository tree did not show a committed root mode-specific `.env.production` or `.env.development` file.

**Risk**
A developer may place a production service credential in `.env.production` and accidentally stage/commit it. The absence of a matching ignore rule is not proof that a secret has already been committed; no such exposure is asserted by this finding.

**Required remediation**
- Add an ignore rule for mode-specific environment files, while explicitly allowing a sanitized `.env.example` if the project needs one.
- Keep real server-side credentials in Cloudflare/Supabase server-side secret stores, not in Vite client-exposed variables.
- Add automated secret scanning for new commits and repository history, with a documented rotation process if a real credential is found.
- Review the final staged file list before commits that add or change environment configuration.

## Environment and secret boundary observations

### Vite client environment variables

- `src/lib/firebase-config.ts` reads Firebase web configuration from `import.meta.env.VITE_FIREBASE_*`.
- The Firebase VAPID public key is also read from a `VITE_` variable.
- Vite's `loadEnv(mode, process.cwd(), '')` loads variables without a prefix filter for use by the Vite configuration and build plugin.
- The FCM worker build plugin copies selected Firebase web configuration values into the generated service worker. Its source comment explicitly states that Firebase web configuration is public client configuration, not a server secret.
- Any variable referenced by browser application code through `import.meta.env` is bundled into client assets. A `VITE_` prefix must never be treated as a secret-storage mechanism.

**Required boundary:** only publish values intended for browser exposure through the frontend build. Do not pass service-role keys, Supabase management tokens, provider signing secrets, mail API keys or other privileged credentials through `VITE_` variables or the worker-generation plugin.

### Supabase browser client

- `src/lib/supabase.ts` hardcodes the Supabase project URL and an anon-role JWT public key.
- The source comment labels it as the public anon key and explicitly says never to add the service-role key to frontend code.
- A Supabase anon key is designed for client use; it does not grant service-role privileges by itself. Database and storage security still depend on server-side authorization and deployed RLS/policies.
- The key's JWT-like appearance does not make it a service-role secret. Its role claim in the inspected literal identifies it as `anon`.

### Firebase browser configuration

- Firebase API key, auth domain, project ID, storage bucket, sender ID, app ID, measurement ID and VAPID public key are loaded from build-time variables.
- Firebase web API keys and VAPID public keys are public client configuration; restrictions, authorized domains and backend rules still matter.
- No Firebase Admin SDK private key or service-account JSON was identified in the selected Firebase frontend files.

### Server-side secret use

- The reviewed Supabase production deployment workflow references `secrets.SUPABASE_ACCESS_TOKEN` through the GitHub Actions secret context and does not place its value in the YAML source.
- The workflow validates that the secret is present and uses it as a bearer token for Supabase Management API access. This is a privileged deployment credential and must remain server-side.
- The repository workflow is source evidence only. This audit did not inspect the actual GitHub secret store, repository/environment permissions, secret exposure history or execution logs.
- Prior Audit 39 documents server-side use of `SUPABASE_SERVICE_ROLE_KEY` and the need to prevent its exposure in client assets, logs and repository history.

## Positive controls observed

1. `.gitignore` excludes the exact `.env` file and `*.local` files.
2. The repository tree listing did not show a root `.env` or mode-specific production environment file.
3. The frontend Supabase client uses the anon-role key and explicitly warns against exposing the service-role key.
4. Firebase client configuration is separated into build-time variables and the worker plugin documents these as public values.
5. The deployment workflow references a GitHub Actions secret expression rather than a literal Supabase access token.
6. The production deployment workflow has `workflow_dispatch` only and read-only repository contents permission in the reviewed YAML; this audit did not execute it.

## Carry-forward risks

- **Audit 39 F39-06:** service-role key reuse for internal Edge Function calls increases blast radius if the key is exposed. Keep it server-side, restrict access, rotate on suspected exposure and consider narrower internal credentials.
- **Audit 43 F43-03:** Cloudflare Pages environment-variable and preview-deployment settings have not been independently verified.
- **Audit 40 / Audit 83:** any privileged value accidentally prefixed with `VITE_` can become part of browser-delivered assets; third-party script compromise and XSS increase the impact of client-exposed data.
- **Audit 44:** dependency/SBOM/provenance and secret scanning coverage remain unverified.

## Verification limits

- No Git history scan for previously committed secrets.
- No automated secret scanner or entropy-based scan was run.
- No complete exhaustive repository content scan was completed; conclusions about absence of secrets are limited to the selected source files and configuration inspected.
- No GitHub repository/environment secret values or permissions were accessed.
- No Cloudflare Pages environment variable values, scopes, preview settings or deployment settings were inspected.
- No Supabase project secret store or Edge Function secret values were accessed.
- No Vite build, tests, deployment, GitHub Actions execution, SQL, database mutation or code remediation was performed.

## Release decision

**NOT PRODUCTION READY.** The reviewed browser configuration uses public Firebase and Supabase client values, and the Supabase deployment workflow references a protected secret expression. However, mode-specific Vite environment files are not comprehensively ignored, and actual GitHub, Cloudflare and Supabase secret-store controls remain unverified. Add the missing ignore protection, run an authorized repository/history secret scan, and verify production and preview secret boundaries before release.
