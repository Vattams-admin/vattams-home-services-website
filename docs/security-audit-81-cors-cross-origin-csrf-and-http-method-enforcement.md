# Security Audit 81 — CORS, Cross-Origin Access, CSRF Exposure and HTTP Method Enforcement

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only Edge Function source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 1 (Low).** The reviewed browser-facing Edge Functions consistently return `Access-Control-Allow-Origin: *`. This permits browser JavaScript hosted on any origin to make and read CORS-approved requests to these endpoints, subject to the endpoint's own authentication and authorization checks. The reviewed authentication model generally passes session tokens in request bodies rather than relying on ambient cookies, so wildcard CORS alone does not establish a conventional cookie-based CSRF bypass or an authentication bypass. It is nevertheless broader than necessary for a production application with known first-party origins.

Method handling is mixed. Some endpoints explicitly reject non-POST requests, while others only special-case OPTIONS and proceed to parse JSON for any other method. Several CORS policies advertise GET/PUT/DELETE even where the endpoint is intended to accept POST only. No credentialed cookie CORS configuration or Origin/Referer-based CSRF validation was found in the reviewed handlers.

## Scope and evidence reviewed

- `supabase/functions/admin-auth/index.ts`
- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/technician-auth/index.ts`
- `supabase/functions/payment-auth/index.ts`
- `supabase/functions/customer-data/index.ts`
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/booking-ops/index.ts`
- `supabase/functions/send-push-notification/index.ts`

## Finding

### F81-01 — Wildcard CORS origin is broader than the first-party application trust boundary

**Severity: Low**

**Evidence**
- The reviewed endpoints set `Access-Control-Allow-Origin: *`.
- The authentication handlers advertise `GET, POST, PUT, DELETE, OPTIONS` in CORS while the data/payment/push handlers generally advertise `POST, OPTIONS`.
- The reviewed endpoints do not dynamically validate the request Origin against an explicit production-origin allow-list.
- The reviewed handlers use custom session tokens in request bodies for customer, technician and admin protected actions. No `Access-Control-Allow-Credentials: true` or cookie-based session flow was observed in this scope.
- `booking-ops` explicitly rejects methods other than POST and returns an Allow header. `send-push-notification` also explicitly rejects non-POST methods. In contrast, several auth/data handlers only return early for OPTIONS and do not visibly reject other methods before parsing the request body.

**Impact**
Any website origin can make CORS-approved requests and read responses when it can supply any required request data. This increases the browser-accessible attack surface and can amplify the impact of a separate token-exposure or client-side compromise. Based on the reviewed token-in-body model, wildcard CORS alone does not let an unrelated site read sessionStorage or automatically attach a user's custom session token, and it is not evidence of a direct unauthenticated privilege bypass.

**Required control**
Restrict `Access-Control-Allow-Origin` to the exact production and approved development origins, return `Vary: Origin` when selecting an origin dynamically, and keep credentials disabled unless a reviewed cookie-based design requires them. Enforce POST (plus OPTIONS preflight) explicitly at every JSON mutation/auth endpoint, and align advertised CORS methods with the actual handler methods.

## Positive controls observed

- `booking-ops` rejects methods other than POST and returns `Allow: POST, OPTIONS`.
- `send-push-notification` rejects methods other than POST.
- Protected customer, technician and admin operations validate server-side session tokens and role/ownership rather than treating CORS as authentication.
- No credentialed wildcard CORS configuration was found in the reviewed files.
- The payment endpoint advertises only POST and OPTIONS.

## Carry-forward and overlap

- Audit 40 recorded frontend/browser security weaknesses, including token storage and missing CSP. This audit focuses on server response CORS policy and method enforcement; it does not re-count those client-side issues.
- Audit 43 recorded Cloudflare header/CSP configuration gaps. This source review cannot establish the live Cloudflare response-header policy or whether edge-level controls add origin restrictions.
- Audit 79's rate-limiting findings are separate; CORS does not replace abuse throttling.

## Verification limits

This is a source review of the named branch. It does not establish live response headers, Cloudflare Transform Rules/WAF behavior, production origin inventory, browser preflight behavior, cookie configuration outside the reviewed functions, or whether other endpoints use different middleware. No cross-origin browser tests, CSRF tests, runtime method probes, builds, SQL, database changes, deployments, GitHub Actions runs or merges were performed.

## Release decision

**NOT PRODUCTION READY.** Replace wildcard CORS with a reviewed first-party origin allow-list, explicitly enforce HTTP methods on all relevant endpoints, and verify actual production response headers at the Cloudflare edge before release.
