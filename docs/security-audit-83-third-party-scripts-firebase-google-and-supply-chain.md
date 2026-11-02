# Security Audit 83 — Third-Party Scripts, Firebase/Google Integrations and Supply-Chain Trust Boundaries

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source and lockfile inspection  
**Release status:** **NOT PRODUCTION READY**

## Executive result

**1 new finding (LOW).** The application bundle uses the npm Firebase SDK locked at version 10.14.1, while the Firebase Messaging service worker imports the compat SDK from Google-hosted `gstatic` URLs at version 10.12.0. This creates version drift between the foreground and background messaging runtimes. Align the versions and validate both paths together.

The repository also loads Google Analytics through a third-party Google Tag Manager-hosted script without Subresource Integrity (SRI). This is a previously documented supply-chain concern (Audit 44), not counted as a new finding here. The existing CSP gap and browser-storage trust boundaries remain release blockers from Audits 40 and 43.

## Scope and evidence

Reviewed on the named branch:
- `package.json`
- `package-lock.json` (lockfile version 3)
- `index.html`
- `src/lib/firebase-config.ts`
- `src/lib/supabase.ts`
- `public/firebase-messaging-sw.js`
- `vite.config.ts`
- Selected analytics, AI and payment module import paths.

This review did not execute package installation, an audit command, build, tests, browser inspection or network requests to third-party providers.

## Finding

### F83-01 — LOW: Firebase Messaging SDK version differs from the application Firebase SDK

**Evidence**
- `package.json` declares `firebase: ^10.14.1`.
- `package-lock.json` resolves `node_modules/firebase` to `10.14.1`, with a registry URL and SHA-512 integrity value.
- The foreground Firebase app and messaging code imports `firebase/app` and `firebase/messaging` from the npm package in `src/lib/firebase-config.ts`.
- `public/firebase-messaging-sw.js` loads `firebase-app-compat.js` and `firebase-messaging-compat.js` from `https://www.gstatic.com/firebasejs/10.12.0/`.
- The service-worker SDK is therefore two patch releases behind the locked application SDK version.

**Risk**
Foreground and background messaging use different Firebase SDK versions. Divergent versions can behave differently and receive fixes on different schedules, making messaging regressions and security maintenance harder to reason about. The inspected source does not establish that this version skew is currently exploitable.

**Required remediation**
- Pin the service-worker compat SDK to the same approved Firebase release as the npm dependency, or document and test a deliberate compatibility matrix.
- Keep the SDK version in one build-time source of truth so the service-worker URL cannot silently drift.
- Validate foreground token registration, background message receipt, notification display, notification click and service-worker upgrade behavior after the version is aligned.
- Record the chosen version and upgrade process in dependency maintenance documentation.

## Existing third-party and supply-chain observations

### Google Analytics / Google Tag Manager

- `index.html` loads `https://www.googletagmanager.com/gtag/js?id=G-SZ2ZGHYW9M` as an asynchronous external script.
- The page also contains an inline initialization block that configures the Google Analytics measurement ID.
- The external script is not accompanied by an SRI `integrity` attribute or `crossorigin` attribute in the reviewed markup.
- Loading a third-party script grants that script execution in the page's origin context. Its behavior and subsequent resources are not pinned by the application's npm lockfile.
- This concern is already recorded in Audit 44's third-party script/SRI supply-chain review and Audit 43/40's CSP findings; it is carried forward rather than duplicated as a new finding.

**Required carry-forward:** assess whether analytics is necessary on authentication, booking, payment and admin routes; minimize data sent; apply an appropriate consent/privacy design; restrict script execution through a tested CSP; and consider a controlled tag governance process. No claim is made here about the live Google Analytics account configuration or actual collected events.

### Firebase and Supabase client configuration

- Firebase browser configuration is populated from `VITE_FIREBASE_*` build-time values in `src/lib/firebase-config.ts`.
- The Vite service-worker configuration plugin embeds the corresponding Firebase web configuration into the built messaging worker. The source comment correctly identifies this as public client configuration, not a server secret.
- `src/lib/supabase.ts` contains the project URL and an anon-role public key. The source comment explicitly warns against placing the service-role key in frontend code.
- A Supabase anon key and Firebase web API key are not treated as server secrets merely because they are visible in browser code. Their security depends on backend authorization, database policies and API restrictions; those are covered by other audits.
- No service-role key was identified in the inspected `src/lib/supabase.ts` content. This is not a repository-wide secret scan and does not prove no secret exists elsewhere or in Git history.

### Package integrity and dependency management

- `package-lock.json` uses lockfile version 3.
- The selected direct dependencies (Firebase, Supabase JS, React, React DOM, Vite and QRCode) have registry-resolved package URLs and SHA-512 integrity metadata in the lockfile.
- The root package scripts define dev, build, lint, preview and typecheck commands. No root `preinstall`, `install` or `postinstall` script is declared in the reviewed `package.json`.
- Lockfile integrity metadata helps verify downloaded package tarballs; it does not prove dependencies are vulnerability-free, publisher accounts are uncompromised, or runtime scripts are trustworthy.
- No SBOM, provenance attestation, automated dependency vulnerability report or signed release evidence was validated in this audit. Audit 44 already tracks supply-chain inventory and maintenance gaps.

## Positive controls observed

1. Firebase npm dependencies are version-locked with registry URLs and integrity hashes.
2. Firebase browser configuration is loaded from build-time environment variables rather than hardcoded as server credentials.
3. The Vite plugin documents Firebase web configuration as public client configuration and uses the same environment variable names for worker injection.
4. The Supabase frontend client uses the anon-role key and explicitly warns against exposing the service-role key.
5. The service-worker Firebase compat URLs are version-pinned rather than floating at an unversioned latest path.
6. No root install lifecycle script was declared in the reviewed package manifest.

## Carry-forward release blockers

- **Audit 44:** third-party external script trust, missing SRI coverage, dependency age/upgrade governance and SBOM/provenance visibility.
- **Audit 40 F40-03 / Audit 43 F43-01:** CSP is absent from the checked Cloudflare `public/_headers` policy.
- **Audit 40 F40-01 / F40-02:** sensitive registration data and bearer sessions remain accessible to same-origin JavaScript, increasing the impact of third-party script compromise or XSS.
- **Audit 70:** consent evidence, privacy requests and access auditing remain outstanding; this audit does not verify analytics consent configuration.
- **Audit 68:** FCM token ownership and revocation concerns remain separate from SDK version alignment.

## Verification limits

- No live requests were made to Google, Firebase, Supabase, npm or other third parties.
- No Cloudflare production response or CSP behavior was checked.
- No Google Analytics property, tag configuration, consent mode or event payloads were inspected.
- No package installation, npm audit, dependency update, build, lint, typecheck or automated tests were run.
- No SBOM, provenance attestation, lockfile regeneration or Git-history secret scan was run.
- No service-worker runtime or browser push notification test was run.
- No code, configuration, database, deployment or branch protection settings were changed.

## Release decision

**NOT PRODUCTION READY.** The inspected dependency lockfile has integrity metadata and Firebase configuration is appropriately treated as public client configuration, but the service-worker Firebase SDK version is out of alignment with the foreground SDK. The external Google Analytics script remains a previously identified third-party trust concern, and the missing CSP and sensitive browser-storage blockers remain unresolved. Complete the carry-forward controls and verify the deployed Cloudflare policy before release.
