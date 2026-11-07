# Reliability fix 120 — payment verification conflict response

## Defect
The payment verification handler used PostgREST single() after a conditional update restricted to status = pending. When no row matched (for example, a payment was already verified or no longer eligible), the single-row cardinality error entered the generic database-error branch and was returned as HTTP 503.

## Correction
Use maybeSingle() for the conditional update. Genuine database errors still return HTTP 503. A successful query with no matching row returns HTTP 409 Conflict, preserving the existing business-state error message.

## Regression coverage
Run npm run test:payment-verification-conflict. The source-contract check verifies the maybe-single query, the 503 database-error branch, and the 409 no-row branch.

## Scope and deployment
This changes only the payment-auth Edge Function source, package script, regression test, and this documentation. It does not deploy the Edge Function, apply migrations, or mutate production data. Cloudflare Pages preview is the website merge gate; it does not deploy Supabase Edge Functions. Production payment verification changes only after a separately authorized Supabase Edge Function deployment and live verification.
