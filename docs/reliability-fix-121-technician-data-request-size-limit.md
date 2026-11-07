# Reliability fix 121 — bound technician-data request bodies

## Confirmed defect
The technician-data Edge Function parsed incoming JSON directly with `req.json()`. That buffers and parses the complete request without an application-level size ceiling. The handler is reachable before session validation completes, so oversized requests can consume avoidable memory and parsing resources.

## Fix
- Add a streaming JSON reader with a 16 KB maximum.
- Enforce the limit from Content-Length and actual streamed bytes.
- Cancel the stream immediately when the byte limit is exceeded.
- Reject malformed UTF-8, invalid JSON, arrays, primitives, and missing bodies as HTTP 400.
- Return HTTP 413 for oversized bodies.
- Register a source-contract regression check.

## Validation and deployment boundary
The regression contract is committed with this change; execute it in a repository runtime before claiming runtime validation. This modifies Supabase Edge Function source only. Cloudflare Pages does not deploy Supabase Edge Functions. No production Edge Function deployment, database migration, production database mutation, or Firestore write is included or performed.

## Website merge gate
Cloudflare Pages preview success for the exact current PR head SHA is the only website merge gate. Vercel and GitHub Actions statuses are not deployment gates.
