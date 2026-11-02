# Security Audit 44 — Dependency and Software Supply-Chain Security

**Audit date:** 2026-10-31  
**Branch:** security/frontend-backend-contract-audit-2026-10-31  
**Scope:** npm manifests and lockfile, resolved dependency versions, integrity metadata, known public advisories, development-server exposure, Firebase SDK version alignment, third-party script loading and dependency governance.  
**Method:** Read-only review of package.json, package-lock.json, Vite configuration, index.html and Firebase Messaging service-worker source. Public advisory databases were consulted for exact Vite version ranges. No npm install, npm audit, build, dependency update, lockfile rewrite, CI workflow or deployment was run.

## Executive result

**Release status: NOT PRODUCTION READY.**

The repository has a committed npm lockfile (lockfileVersion 3) with 438 installed package entries; all 438 entries have integrity hashes and none of the inspected resolved package URLs use GitHub/GitLab/Bitbucket git sources. This is a positive reproducibility baseline.

However, the lockfile resolves Vite to **5.4.8**, below security fixes for two published Vite advisories. One affects the Vite development server on Windows when exposed to the network; the Vite configuration binds the dev server to 0.0.0.0, so the exposure condition must be taken seriously for Windows developer environments. The Firebase package resolves to 10.14.1 while the separate messaging service worker imports Firebase compat scripts at 10.12.0. The root page also loads Google Tag Manager from a third-party host. No automated dependency vulnerability scan, SBOM generation or dependency update policy is defined in package scripts.

A full npm audit result is not available from this read-only review. Findings below distinguish confirmed lockfile version/advisory matches from conditional runtime impact and governance gaps.

## Findings

### F44-01 — MEDIUM: Locked Vite 5.4.8 is below published security fixes for the Windows development-server attack surface

**Evidence**
- package.json requests Vite ^5.4.2.
- package-lock.json resolves node_modules/vite to 5.4.8.
- vite.config.ts configures server.host as 0.0.0.0, binding the development server to all network interfaces, and sets strictPort false.
- GHSA-c27g-q93r-2cwf / CVE-2024-52011 affects Vite versions before 5.4.9; the issue concerns command execution through the Windows launch-editor path. The advisory lists 5.4.9 as the fixed Vite version.
- GHSA-93m4-6634-74q7 / CVE-2025-62522 affects Vite 5.2.6 through versions before 5.4.21; the issue can bypass server.fs.deny when a request path ends with a backslash on Windows. The advisory states that impact requires a Windows development server exposed to the network.
- The checked-in Vite configuration's all-interface binding satisfies the network-exposure part of the latter condition; actual developer host OS and whether the dev server is reachable by untrusted users were not verified.

**Risk**
Vite is a development/build dependency rather than a runtime dependency shipped as the production application server. Therefore, these advisories do not by themselves establish a production website exploit. They do create a development workstation/build-environment risk if the dev server is run on Windows and reachable from an untrusted network. The resolved version is below both fixed versions, so the lockfile needs remediation regardless of whether every exploit precondition applies to every developer.

**Required remediation**
- Upgrade Vite to a currently supported patched release on the selected major line (at minimum 5.4.21 for the cited 5.x advisory range), then regenerate and review the lockfile.
- Prefer binding the local dev server to localhost by default; expose it to the LAN only when explicitly required and only on a trusted network.
- Confirm developer OS and network exposure assumptions; do not treat a production static deployment as the Vite dev server.
- Run the dependency audit and relevant development-server security tests after the update.

### F44-02 — MEDIUM: Firebase Messaging service-worker SDK version differs from the installed Firebase package

**Evidence**
- package.json and package-lock.json resolve the Firebase npm package to 10.14.1.
- public/firebase-messaging-sw.js loads firebase-app-compat.js and firebase-messaging-compat.js from gstatic at version 10.12.0 using importScripts.
- The Vite build plugin injects public Firebase web configuration into this service worker, but does not align or validate the external compat script version against the npm package version.
- The service worker receives background push payloads and displays notifications.

**Risk**
The page application and service worker run different Firebase SDK versions. Version skew can produce behavior differences, inconsistent bug/security fixes, and harder-to-reproduce messaging failures. This review did not establish a known exploitable vulnerability in Firebase 10.12.0; the finding is a dependency-alignment and maintenance risk, not a claim that a Firebase CVE is present.

**Required remediation**
- Align the service-worker Firebase compat version with the tested Firebase application SDK version, or document and test a deliberate compatibility matrix.
- Keep the worker SDK version in one centrally maintained build variable rather than a separate hardcoded literal.
- Include background notification delivery and worker-upgrade regression tests in release validation.
- Review Firebase advisories for the exact locked transitive @firebase packages during a full npm audit.

### F44-03 — MEDIUM: Third-party browser scripts execute without a repository-managed integrity or change-control mechanism

**Evidence**
- index.html loads Google Tag Manager/Google Analytics from www.googletagmanager.com using a third-party script URL and an inline initialization block.
- public/firebase-messaging-sw.js imports Firebase compat scripts from www.gstatic.com at runtime.
- The checked-in source does not include Subresource Integrity hashes for these external script resources, a locally vendored copy, or an explicit third-party script inventory/change-approval record.
- The current Cloudflare header file was reviewed separately in Audit 43 and does not include a CSP.

**Risk**
Third-party scripts execute with browser privileges available to the page or service worker. A compromised or unexpectedly changed upstream script can affect the application even if the application repository itself has not changed. SRI is not supported in the same way for service-worker importScripts; CSP and controlled dependency/version updates are therefore important compensating controls.

**Required remediation**
- Maintain an inventory of third-party scripts, owners, purpose, data collected and approved origins.
- Where technically supported, use SRI and crossorigin settings for static external scripts; otherwise pin explicit versions and document the vendor trust dependency.
- Consider self-hosting appropriate stable assets where licensing and vendor guidance permit.
- Deploy a restrictive CSP after mapping required sources (see Audit 43), and review analytics consent/privacy requirements.
- Monitor upstream security advisories and define a rapid removal/rollback process for compromised integrations.

### F44-04 — LOW/MEDIUM: Dependency vulnerability scanning and SBOM generation are not part of the checked-in project workflow

**Evidence**
- package.json scripts include dev, build, lint, preview and typecheck.
- No npm audit, audit-level gate, SBOM generation or dependency policy script is defined in the inspected package.json.
- A package-lock.json is committed and includes integrity hashes for all 438 package entries.
- No GitHub Actions workflow was run or relied on for this review; the user has explicitly prohibited GitHub Actions execution for this project.

**Risk**
The committed lockfile helps reproduce the dependency tree, but it does not itself notify maintainers when a new advisory affects a locked package. Without a scheduled or release-time review process, vulnerable direct or transitive packages can remain unnoticed. This review did not run npm audit and cannot report a current vulnerability count for all 438 entries.

**Required remediation**
- Establish a dependency review process that does not require enabling or running GitHub Actions if that remains prohibited.
- Run npm audit --json in an authorized local or controlled environment and retain the dated report; review production-only and full-tree results separately.
- Generate an SBOM (CycloneDX or SPDX) for release artifacts and record the lockfile hash.
- Define severity-based remediation SLAs, exception ownership and periodic review cadence.
- Re-run scans after lockfile changes and before each production release.

### F44-05 — LOW/MEDIUM: Project identity and dependency version policy are not release-oriented

**Evidence**
- package.json identifies the project as vite-react-typescript-starter with version 0.0.0.
- Direct dependency ranges use caret ranges, while package-lock.json pins the concrete versions.
- The project includes several older direct package baselines (including Vite 5.4.8, Firebase 10.14.1 and lucide-react 0.344.0); this observation alone does not establish that each package is vulnerable.
- No Node/npm engine range or supported runtime version is specified in package.json.

**Risk**
The generic package identity and absence of an explicit supported Node/npm toolchain make build provenance and maintenance ownership less clear. Caret ranges are normal when a lockfile is consistently used, but contributors or build systems that ignore the lockfile can resolve different versions within the allowed ranges.

**Required remediation**
- Set an accurate private project name and release versioning policy.
- Specify and document supported Node.js and npm versions (for example via engines and a version file) based on the actual Cloudflare build environment.
- Require deterministic lockfile-based installs for release builds (npm ci).
- Review direct dependency update cadence and test major/minor upgrades before release.

## Positive controls observed

1. package-lock.json is committed and uses lockfileVersion 3.
2. All 438 resolved package entries inspected have npm integrity hashes.
3. No git-based package source was found in the resolved lockfile entries inspected.
4. Firebase, React and Supabase dependencies are declared in package.json rather than loaded from arbitrary JavaScript package URLs in the application bundle.
5. Vite is classified as a development dependency in the lockfile, which helps distinguish development-server advisories from production runtime exposure.
6. The project has build, lint and TypeScript typecheck scripts.
7. The .gitignore excludes .env and *.local files.
8. The Firebase service worker references an explicit versioned compat SDK URL rather than an unversioned latest alias.
9. No npm package credential or secret value was identified in the inspected package manifest or lockfile excerpts.

## Advisory references reviewed

- Vite GHSA-c27g-q93r-2cwf / CVE-2024-52011, fixed in Vite 5.4.9: https://github.com/advisories/GHSA-c27g-q93r-2cwf
- Vite GHSA-93m4-6634-74q7 / CVE-2025-62522, fixed in Vite 5.4.21 for the 5.x line: https://github.com/advisories/GHSA-93m4-6634-74q7
- npm audit command behavior and reporting: https://docs.npmjs.com/cli/commands/npm-audit/

## Verification not performed

- No npm install, npm ci, npm audit or npm audit fix.
- No OSV scanner, Snyk, Dependabot, Socket or other SCA tool was executed.
- No SBOM was generated.
- No build, lint, typecheck or runtime test was executed.
- No Windows Vite development-server reproduction or exploit test was run.
- No Firebase/Google vendor account, release pipeline or third-party script integrity dashboard was inspected.
- No GitHub Actions workflow was executed.
- No code, package manifest, lockfile, Cloudflare configuration or production environment was modified.

## Required release gates

1. Upgrade locked Vite to a patched supported version and reduce unnecessary dev-server network exposure.
2. Align Firebase Messaging worker and application SDK versions.
3. Establish third-party script inventory and browser-side trust controls.
4. Implement a repeatable dependency vulnerability and SBOM review process outside prohibited automation.
5. Make release builds use a documented Node/npm toolchain and deterministic lockfile installs.

**Conclusion:** Audit 44 is complete as a read-only repository and public-advisory review. The lockfile has strong integrity metadata, but Vite 5.4.8 is below published fixes, Firebase worker and app SDK versions are inconsistent, third-party script governance is incomplete, and a complete npm audit was not run. The marketplace remains **NOT PRODUCTION READY**.
