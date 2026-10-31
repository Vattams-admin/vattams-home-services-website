# Security Audit 43 — Cloudflare Deployment Security and Release Integrity

**Audit date:** 2026-10-31  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Scope:** Cloudflare Pages-oriented static hosting, HTTP response headers, SPA routing, cache policy, PWA/service-worker lifecycle, Vite build output, committed build artifacts and release/deployment evidence.  
**Method:** Read-only review of repository configuration and source. No Cloudflare dashboard, DNS zone, Pages project, production HTTP response, TLS certificate, cache rule, deployment log or domain setting was accessed.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository contains a Cloudflare Pages-compatible public/_headers file, SPA fallback public/_redirects, Vite static build configuration, prerendered public SEO pages and two service workers. Configured headers include HSTS, nosniff, frame protection, referrer policy and a restrictive Permissions-Policy. Hashed assets are configured for long-lived immutable caching, while the general response rule requests no-store caching.

The main release blockers are: no Content Security Policy is defined in the repository response-header policy; the service worker deletes every origin cache other than its own cache on activation and keeps a cache-first strategy for non-code assets; and Cloudflare Pages project settings, DNS/TLS state, environment variables, cache rules and deployed response headers cannot be verified from this repository. Several generated Vite timestamp artifacts also remain committed and expose local build paths/source-map configuration unnecessarily.

## Findings

### F43-01 — HIGH: No Content Security Policy is configured in the repository response-header policy

**Evidence**
- public/_headers defines X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=63072000; includeSubDomains; preload, Permissions-Policy: geolocation=(), camera=(), microphone=() and Cache-Control directives.
- No Content-Security-Policy or Content-Security-Policy-Report-Only directive is present in the reviewed file.
- index.html loads Google Tag Manager/Google Analytics from www.googletagmanager.com and includes inline JavaScript.
- Firebase Messaging imports scripts from www.gstatic.com; Supabase, Firebase and other external services are used elsewhere in the application.

**Risk**
Without a CSP, the browser has no server-enforced allowlist for script, style, connection, frame, image and worker sources. Existing React escaping and other controls reduce some injection risks but do not replace CSP as a defense-in-depth browser boundary. A future script injection or compromised third-party script would have fewer browser-enforced restrictions.

**Required remediation**
- Design a CSP from observed production resource requirements; include explicit default-src, script-src, connect-src, img-src, style-src, font-src, worker-src, manifest-src, frame-src, base-uri and object-src controls as applicable.
- Refactor inline scripts to external scripts or nonce/hash-based policy where feasible; do not add broad unsafe-eval or wildcard sources to make the policy pass.
- Deploy first in report-only mode, inspect violations across customer, technician and admin journeys, then enforce.
- Verify the actual Cloudflare-served response header after deployment.

### F43-02 — MEDIUM: Service-worker activation deletes unrelated origin caches and static assets can remain stale

**Evidence**
- public/sw.js uses cache name vattams-v5.
- During activation it calls caches.keys() and deletes every cache whose name is not exactly vattams-v5, without restricting deletion to a VATTAMS-specific cache prefix.
- For same-origin GET requests other than HTML and JS/CSS, the worker returns a cache hit before attempting network fetch.
- Static assets are stored in the cache and the cache name must be manually changed to invalidate the old cache.
- The code correctly prefers the network for HTML and JavaScript/CSS and falls back to cached HTML if offline; the separate FCM worker is registered with a narrow scope.

**Risk**
If another application or independently managed feature on the same origin uses Cache Storage, this worker can delete its caches on activation. Cache-first images and other static files can also remain stale until a cache-version change or cache eviction, causing mismatched branding or stale public assets after deployment.

**Required remediation**
- Delete only caches under an explicit application-owned prefix, such as vattams-, and preserve unrelated origin caches.
- Use content-hashed asset names or an explicit versioned asset manifest for cache invalidation; ensure the release process updates the cache version when needed.
- Test upgrade from the previous service-worker version, offline behavior, old-tab behavior, and coexistence with other same-origin applications.
- Keep HTML and executable code network-first; review whether any user-specific or sensitive response could ever enter Cache Storage.

### F43-03 — MEDIUM: Cloudflare Pages project, DNS, TLS and production response configuration are not represented or verifiable in the repository

**Evidence**
- The repository contains public/_headers and public/_redirects, but no checked-in wrangler.toml, wrangler.json, Pages deployment configuration or equivalent project manifest was found in the root listing.
- vite.config.ts defines Vite build plugins and output generation, but no Cloudflare Pages project name, build command/output directory, production branch, preview-branch policy or environment-variable contract is recorded in the inspected repository files.
- The root _redirects file configures a catch-all SPA fallback to /index.html.
- No live Cloudflare project, DNS zone, TLS settings, cache rules, redirect rules or deployed response headers were inspected.

**Risk**
A repository policy is not proof that the live Cloudflare project applies it. A dashboard override, missing build variable, incorrect output directory, preview-branch exposure, DNS misconfiguration or missing TLS setting could make production differ from reviewed source. The catch-all SPA fallback also needs live validation to ensure static assets and intended 404 responses are not rewritten unexpectedly.

**Required remediation**
- Maintain a release configuration record for Cloudflare Pages: production project, production branch, build command, output directory, required public build variables, secret variable names (never values), preview deployment policy and rollback owner.
- Verify custom-domain DNS, HTTPS/TLS mode, certificate coverage, automatic HTTPS redirects, minimum TLS and deployed security headers from the Cloudflare dashboard or an authorized production check.
- Confirm preview deployments do not expose production secrets or privileged backend configuration.
- Test known static files, prerendered routes, unknown routes and missing asset paths against the deployed site.
- Keep Cloudflare as the deployment platform; no Vercel deployment is required or recommended by this audit.

### F43-04 — LOW/MEDIUM: Generated Vite timestamp bundles are committed and disclose local build paths

**Evidence**
- The repository root contains multiple files named vite.config.ts.timestamp-*.mjs.
- The inspected files contain absolute local paths such as file:///home/project/node_modules/... and file:///home/project/vite.config.ts.
- Their inline source maps embed the original Vite configuration source.
- The checked-in current vite.config.ts is the maintained configuration; these timestamp files are generated artifacts and are not referenced by the current package scripts.

**Risk**
The artifacts disclose developer/build workspace paths and duplicate stale configuration snapshots. They create uncertainty about which configuration is authoritative and add avoidable files to source history. No credential or secret was identified in the inspected timestamp artifacts.

**Required remediation**
- Remove generated timestamp bundles from the source repository.
- Add an appropriate ignore rule for Vite config timestamp artifacts and other transient build outputs.
- Keep the source Vite config and lockfile as the authoritative build inputs.
- Review Git history for any separate sensitive values before treating this cleanup as complete.

### F43-05 — MEDIUM: Production cache and security-header behavior has not been verified at the Cloudflare edge

**Evidence**
- public/_headers requests no-store caching for the general path and one-year immutable caching for /assets/*.
- It explicitly sets JavaScript and CSS content types for selected asset paths.
- public/_redirects provides a global 200 rewrite to /index.html.
- The repository does not provide a production response capture or automated assertion proving the edge applies these rules as intended.

**Risk**
Cloudflare Pages header/redirect precedence and any dashboard-level rules can affect actual responses. If immutable caching is applied to non-fingerprinted files, users may retain outdated code or assets. If no-store is not applied to HTML, clients may receive stale entry documents. A SPA fallback can also make missing asset requests appear to return HTML, causing confusing runtime failures.

**Required remediation**
- Capture headers and status codes for /, /assets/<hashed-file>, /manifest.json, /sw.js, /firebase-messaging-sw.js, prerendered city/service pages and a nonexistent asset.
- Confirm HTML is revalidated/not stored by browser/CDN while content-hashed assets are immutable.
- Confirm missing static assets return 404 rather than SPA HTML.
- Verify deployed HSTS, CSP, frame, referrer and Permissions-Policy headers on apex and production subdomains.
- Add a repeatable post-deployment smoke check that does not deploy or mutate production.

## Positive controls observed

1. Cloudflare Pages-compatible _headers and _redirects files are present.
2. HSTS, nosniff, SAMEORIGIN, strict-origin referrer policy and a restrictive Permissions-Policy are configured in source.
3. The general path requests no-store caching and /assets/* requests immutable caching.
4. The service worker prefers network responses for HTML and JavaScript/CSS to reduce stale executable bundles.
5. The main service worker and Firebase Messaging worker use separate scopes; the FCM worker does not take over root page fetches.
6. The Vite build generates prerendered public service/city/technician pages with HTML escaping for dynamic city content.
7. Unserved city pages are emitted with a noindex directive in the prerendering logic.
8. Firebase public web configuration is embedded in the FCM worker at build time; the Vite config explicitly describes it as public client configuration.
9. The package lockfile is present and records dependency versions and integrity hashes.
10. No Vercel-specific deployment configuration was identified in the inspected root configuration.

## Verification not performed

- No Cloudflare dashboard or API access.
- No DNS lookup, nameserver, DNSSEC, certificate, TLS or HTTPS redirect verification.
- No live production or preview HTTP request; deployed headers/cache/redirect behavior remains unverified.
- No Cloudflare Pages build or deployment was triggered.
- No Vite build, lint, typecheck or dependency audit was run.
- No GitHub Actions workflow was executed.
- No Supabase SQL, migration or Edge Function deployment was run.
- No branch protection, production branch or Cloudflare environment-secret settings were inspected.
- No browser cache/service-worker upgrade test was run.

## Required release gates

1. Add and safely roll out a restrictive CSP after mapping required external resources.
2. Scope service-worker cache cleanup to application-owned cache names and implement predictable asset invalidation.
3. Verify Cloudflare Pages project settings, DNS/TLS and deployed response headers.
4. Remove generated Vite timestamp artifacts and prevent recurrence.
5. Validate production caching and SPA/static-asset routing with read-only smoke checks.

**Conclusion:** Audit 43 is complete as a repository-source review. The repository has a reasonable baseline of HTTP headers, static asset caching and service-worker separation, but CSP is absent, service-worker cache cleanup is too broad, generated local build artifacts are committed, and live Cloudflare configuration has not been independently verified. The marketplace remains **NOT PRODUCTION READY**.
