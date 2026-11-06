# Investigation 338 — Surface rejected retry terminalization to the scheduler

Date: 2026-11-06  
Repository: `Vattams-admin/vattams-home-services-website`  
Branch: `fix/retry-terminalization-http-status`

## Defect confirmed

The retry worker correctly counted `terminalizationFailures` when the lease-fenced terminalization RPC returned false (for example, because the claim had expired or been reclaimed). However, its final HTTP status calculation only considered defer failures, provider failures, tracking failures, and sender failures. A batch containing only a rejected terminalization could therefore return HTTP 200 despite exposing a non-zero failure counter in its JSON body.

Schedulers and monitoring systems commonly use the HTTP status as the primary success signal. Returning 200 could hide an incomplete retry batch and prevent operational alerting.

## Fix

- Include `terminalizationFailures > 0` in the retry worker's HTTP 500 condition.
- Keep the detailed per-delivery terminalization result and aggregate counter in the response.
- Extend `test:terminalized-retry-summary` to assert that failed or stale-claim terminalization is surfaced as a non-success HTTP result.

## Validation boundary

The change is source code and regression-contract coverage only. It does not deploy the Supabase Edge Function. No production Supabase changes were performed. Cloudflare Pages preview remains the website deployment gate, but Cloudflare Pages does not deploy Supabase Edge Functions or SQL migrations.
