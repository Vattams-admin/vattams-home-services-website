# Security Audit 40 — Frontend Security, XSS, Browser Storage and Client-Side Trust Boundaries

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** React rendering sinks, security headers, browser storage, route guards, user-generated content, dynamic links/media, service-worker navigation and frontend security helpers.  
**Method:** Read-only source inspection of the frontend, public headers and service workers. No browser runtime, deployed Cloudflare response headers, penetration testing or live user session was used.

## Executive result

**Release status: NOT PRODUCTION READY.**

The frontend benefits from React's normal text escaping, a small number of safe external-link attributes, Cloudflare static security headers, and server-side custom-session authorization behind protected data APIs. The reviewed code does not demonstrate a general HTML injection sink: the only `dangerouslySetInnerHTML` occurrence located is a JSON-LD script populated by `JSON.stringify`. However, several browser-side trust boundaries need attention: technician registration drafts store extensive personal and KYC-related data in persistent localStorage; customer/technician/admin session tokens are stored in JavaScript-readable sessionStorage; no Content Security Policy is configured in the checked Cloudflare headers; and the frontend rate-limit helper is in-memory and not demonstrated as used by protected actions.

## Findings

### F40-01 — HIGH: Technician registration draft persists sensitive personal and KYC data in localStorage

**Evidence**
- `src/lib/technicianRegistration.ts` stores a draft under `vattams_technician_registration_draft_v1`.
- The draft is built from the complete registration form with only the password removed: `const { password: _password, ...rest } = form`.
- The persisted object also includes the full chat history and timestamp.
- The registration form includes identity/document URL fields (Aadhaar/PAN/driving licence), profile photo, bank and UPI details and other personal registration information.
- The comment explicitly says the draft is retained in localStorage so registration can resume after closing the tab or refreshing.

**Risk**
localStorage is persistent and readable by any JavaScript executing on the same origin. A successful XSS, compromised third-party script or malicious browser extension can read retained registration data even after the user leaves the registration page. KYC document URLs and payout details are particularly sensitive. The password is intentionally excluded, which is a positive but incomplete safeguard.

**Required remediation**
- Do not persist KYC document URLs, bank account/IFSC/UPI details, identity numbers or other high-risk fields in localStorage.
- Prefer a short-lived, server-side, resumable registration draft keyed to a verified one-time registration capability.
- If local draft persistence remains necessary, persist only low-sensitivity fields, apply a short expiry, validate parsed shape/version, clear on completion/cancel and document shared-device risks.
- Review whether chat history is necessary to persist; minimize and expire it.
- Test draft cleanup after successful registration, expiry and logout/account switching.

### F40-02 — HIGH: Authentication session tokens are stored in JavaScript-readable browser storage

**Evidence**
- Customer login stores `vattams_customer_session` in sessionStorage.
- Technician login stores `vattams_technician_session` in sessionStorage.
- Admin login stores `vattams_admin` in sessionStorage.
- Frontend request wrappers retrieve these values and send them in JSON bodies to Supabase Edge Functions.
- The route guard checks only whether a storage key exists; server-side function checks are still required for actual data access.

**Risk**
sessionStorage is not an HttpOnly cookie and is accessible to JavaScript running in the page origin. An XSS or compromised dependency can steal active customer, technician or administrator bearer tokens. Admin tokens have especially high impact. The server-side session expiry and role checks reduce exposure duration but do not prevent token theft while valid.

**Required remediation**
- Evaluate a same-site, Secure, HttpOnly cookie-backed session architecture with CSRF protection for browser sessions, where compatible with the deployment architecture.
- If bearer tokens remain in web storage, reduce lifetime and scope, implement robust server-side revocation and rotate tokens after sensitive events.
- Strengthen XSS prevention and dependency/script controls before relying on browser-held bearer credentials.
- Ensure no token is logged, copied into URLs, analytics, error reporting or persisted registration drafts.
- Perform an authorized XSS/token-theft simulation in a staging environment.

### F40-03 — MEDIUM: Content Security Policy is absent from the checked Cloudflare static security headers

**Evidence**
- `public/_headers` configures `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, HSTS, Referrer-Policy, Permissions-Policy and cache controls.
- No `Content-Security-Policy` or `Content-Security-Policy-Report-Only` directive appears in this file.
- The application loads Firebase messaging scripts from Google, uses Supabase endpoints and includes other external integrations, so a policy needs to be designed against actual runtime dependencies.
- The repository file is evidence of intended static headers only; deployed Cloudflare response headers were not inspected.

**Risk**
Without CSP, the browser lacks a major defense-in-depth control to restrict script execution, inline script behavior, frames, object embedding and unexpected network destinations. This increases the impact of any injection defect or compromised third-party resource.

**Required remediation**
- Design and deploy a restrictive CSP, starting in report-only mode.
- Explicitly allow required script, style, image, connect, font, worker, frame and manifest sources.
- Prefer nonce/hash-based script policies and remove unsafe-inline/unsafe-eval where feasible.
- Include `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'` (or stricter) and appropriate form-action restrictions.
- Verify CSP on actual production HTML and all relevant routes after Cloudflare deployment.

### F40-04 — MEDIUM: Frontend rate-limit helper is process-local and not demonstrated as enforced by sensitive actions

**Evidence**
- `src/lib/security.ts` implements `rateLimit()` using a module-level JavaScript `Map`.
- The map exists only in the current page runtime; it resets on reload and is not shared across tabs, devices, users or server instances.
- Repository code search located the helper definition but no call site for `rateLimit(`.
- Audit 39 separately found no general distributed server-side rate-limit middleware in the inspected Edge Functions.

**Risk**
A client-side in-memory counter cannot protect an API from direct requests, modified clients, browser reloads or distributed callers. If treated as a security control, it creates false confidence. The current evidence does not establish that this helper is actually applied to login, booking, support or notification operations.

**Required remediation**
- Treat browser-side rate limits as UX-only.
- Enforce authoritative distributed limits at Cloudflare/API gateway and Edge Function layers.
- Remove unused security helpers or document their limited purpose.
- Add tests that call protected APIs directly while bypassing the browser UI.

### F40-05 — MEDIUM: Notification service worker accepts arbitrary absolute navigation URLs from notification payload data

**Evidence**
- `public/firebase-messaging-sw.js` reads `event.notification.data.url`.
- It resolves the value using `new URL(requestedUrl, self.location.origin).href`.
- It then navigates an existing window client to the resulting URL or calls `clients.openWindow(targetUrl)`.
- The code checks whether an existing client is same-origin, but does not require the destination URL itself to have the same origin.

**Risk**
If a notification payload contains an attacker-controlled absolute URL, clicking the notification can navigate/open an external website. This is not proof of script execution or a current exploitable injection, but it creates a phishing/open-redirect-style trust boundary in a trusted notification interaction.

**Required remediation**
- Parse the requested URL and reject any origin other than `self.location.origin`.
- Prefer mapping an allowlisted notification route identifier and validated entity ID to a same-origin URL.
- Reject non-HTTP(S) schemes and unexpected path forms.
- Add tests for absolute external URLs, protocol-relative URLs, javascript/data schemes, encoded paths and valid internal routes.

### F40-06 — LOW/MEDIUM: Client-side route guards are based on storage-key presence and must not be treated as authorization

**Evidence**
- `src/lib/router.tsx` protects customer, technician and admin page routes by checking whether a corresponding sessionStorage key exists.
- The route guard does not validate token expiry, role or server-side session validity before rendering the route.
- Some individual dashboard pages perform further session checks, and the reviewed Edge Functions enforce server-side sessions and role checks before protected data operations.

**Risk**
A user can manually set a storage key and reach a protected page shell. This is not, by itself, a backend authorization bypass because the protected APIs are expected to enforce server-side authorization. However, any sensitive data or privileged action implemented only in the client would be exposed if it relied on this guard.

**Required remediation**
- Treat route guards strictly as navigation UX.
- Require server-side authorization for every protected read and mutation.
- Ensure protected page shells do not embed sensitive data in static bundles, HTML, hydration state or public API responses.
- Test direct route access with missing, expired, forged and cross-role session tokens.

## Positive controls observed

1. Cloudflare static headers include `X-Content-Type-Options: nosniff`.
2. Static headers include `X-Frame-Options: SAMEORIGIN` and HSTS with `includeSubDomains`.
3. Referrer-Policy is set to `strict-origin-when-cross-origin`.
4. Permissions-Policy disables geolocation, camera and microphone for the site by default.
5. React renders reviewed customer review text and notification content as ordinary text nodes rather than HTML.
6. The only located `dangerouslySetInnerHTML` use is JSON-LD serialization via `JSON.stringify`, not raw user-provided HTML.
7. Several external links opened in new tabs include `rel="noopener noreferrer"`.
8. Customer, technician and admin API handlers reviewed in Audit 39 enforce server-side session/role checks; frontend route guards are not the only security boundary.
9. Technician registration deliberately excludes the password from its local draft.

## Verification not performed

- No production browser or deployed Cloudflare response-header test.
- No XSS, DOM clobbering, CSP bypass or dependency compromise penetration test.
- No runtime inspection of every React component and third-party dependency.
- No inspection of all database-originated URLs or external media in a live session.
- No service-worker push payload injection test.
- No browser storage forensic test on shared devices.
- No build, test suite, deployment or GitHub Actions run.
- No production session revocation or cookie architecture change.

## Required release gates

1. Stop persisting sensitive KYC and payout data in localStorage; implement a safer short-lived resume design.
2. Reduce the exposure of bearer sessions to JavaScript and harden XSS defenses.
3. Deploy and verify a restrictive CSP on production Cloudflare responses.
4. Enforce distributed API rate limits server-side; do not rely on the frontend Map helper.
5. Enforce same-origin URL validation in notification-click navigation.
6. Verify every protected API operation independently of client-side route guards.

**Conclusion:** Audit 40 is complete as a repository-source review. React escaping and several static headers are positive controls, but sensitive registration data and session tokens remain accessible to same-origin JavaScript, CSP is not configured in the checked header file, and service-worker navigation trusts payload URLs. The marketplace remains **NOT PRODUCTION READY**.
