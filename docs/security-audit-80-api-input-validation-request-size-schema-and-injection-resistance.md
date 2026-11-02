# Security Audit 80 — API Input Validation, Request-Size Limits, Schema Enforcement and Injection Resistance

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Release status:** **NOT PRODUCTION READY**

## Executive summary

**New findings: 2 (both Medium).** Validation is inconsistent across the Edge Functions. The booking creation path has meaningful object-shape checks and explicit field-length limits, and payment actions apply several strict allow-lists and formats. However, multiple other public handlers parse request JSON without an application-level body-size ceiling or shared schema validation. Customer profile and support-message writes accept caller-supplied values without equivalent field-level length/type/format checks.

No direct SQL string concatenation or raw SQL construction was identified in the reviewed handlers; database access predominantly uses Supabase query-builder methods and parameterized RPC arguments. This is a positive control, not proof that every database function is injection-safe.

## Scope and evidence reviewed

- `supabase/functions/booking-ops/index.ts`
- `supabase/functions/customer-auth/index.ts`
- `supabase/functions/customer-data/index.ts`
- `supabase/functions/technician-auth/index.ts`
- `supabase/functions/technician-data/index.ts`
- `supabase/functions/admin-auth/index.ts`
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/payment-auth/index.ts`

## Findings

### F80-01 — No consistent request-body size ceiling or shared request schema at Edge Function entry points

**Severity: Medium**

**Evidence**
- The reviewed handlers commonly call `await req.json()` directly before applying action-specific checks. Examples include customer-auth, customer-data, technician-auth, technician-data, admin-auth, admin-data and payment-auth.
- These entry points do not visibly check `Content-Length`, stream-read with a byte ceiling, or enforce a shared maximum JSON payload size before parsing.
- `booking-ops` is stronger: it checks that the top-level body and nested booking are objects and validates key booking fields and lengths. The same standard is not applied consistently to the other endpoints.
- A malformed JSON catch in some handlers handles parse errors, but malformed-input handling does not bound the size of a valid JSON payload.

**Impact**
Oversized JSON requests can consume unnecessary memory and CPU during parsing and downstream processing. Unbounded nested values can also increase database write, logging and response costs. An upstream platform limit may exist, but it is not established by this application source review.

**Required control**
Apply a common bounded-body reader before JSON parsing, reject unsupported content types, enforce a documented byte ceiling, and validate each action against a strict schema with unknown-field handling. Verify any Cloudflare/Supabase platform request limits separately.

### F80-02 — Customer profile and support writes lack server-side field constraints

**Severity: Medium**

**Evidence**
- `customer-data` profile action constructs an update from `body.full_name`, `email`, `city` and `address`, with no visible type, maximum-length, or email-format validation before writing.
- The support action converts `subject` and `message` to strings and trims them, but does not enforce required values, maximum lengths or a structured content policy before inserting into `support_messages`.
- By contrast, `booking-ops` checks required booking fields and limits customer name, city, address and problem description lengths; `payment-auth` limits payee name and notes and validates UTR format; `customer-auth` validates mobile/email format and a minimum password length.
- Customer review submission constrains rating to an integer from 1 to 5, but the reviewed handler does not impose a visible maximum length on `review_text`.

**Impact**
Authenticated customers can submit oversized or malformed profile/support/review text. This can create data-quality problems, excessive storage and downstream rendering/logging risks. Any later UI that renders these fields unsafely could amplify the risk; this review did not establish such a rendering exploit.

**Required control**
Define per-action schemas with strict types, required fields, length bounds, email normalization/validation and explicit nullability. Apply the same limits at the database boundary where appropriate. Treat user text as untrusted output and render it with safe text escaping.

## Positive controls observed

- Booking creation validates the top-level JSON object and nested booking object.
- Booking creation requires a valid 10-digit mobile and limits name (120), city (100), address (1,000) and problem description (2,000) characters.
- Payment creation fixes the supported purpose and amount, validates the technician mobile and caps payee name (120) and notes (300).
- UTR submission enforces a 6–32 alphanumeric format.
- Customer authentication validates mobile/email formats and minimum password length.
- Customer review rating is restricted to integer values 1–5.
- Database access in reviewed functions uses Supabase query-builder calls and RPC parameters; no raw SQL concatenation was identified in these files.

## Carry-forward and overlap

- Earlier Audit 56 recorded server-side booking/profile validation gaps. This audit confirms that booking creation has field limits in the current branch but customer profile/support handlers remain less constrained.
- Audit 31 recorded missing text-size limits in customer support/review paths. F80-02 consolidates the current profile/support/review input-validation gap and does not count those historical references as separate findings.
- Audit 79 recorded missing rate limits. Request-size/schema controls in this audit are a separate resource and validation boundary, not a duplicate rate-limit finding.

## Verification limits

This is a source review of the named branch. It does not establish Cloudflare request-body limits, Supabase Edge runtime hard limits, database column constraints, downstream email/logging behavior, or every frontend rendering sink. No fuzzing, oversized-request tests, SQL execution, database writes, migrations, builds, automated tests, deployments, GitHub Actions runs or merges were performed.

## Release decision

**NOT PRODUCTION READY.** Standardize bounded request parsing and action-level schemas across all Edge Functions. Close the customer profile/support validation gaps, then test malformed, oversized, wrong-type, deeply nested and boundary-length inputs against deployed endpoints.
