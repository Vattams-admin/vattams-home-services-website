# Investigation 336 — Report terminalized retry outcomes

Date: 2026-11-06  
Repository: `Vattams-admin/vattams-home-services-website`  
Branch: `fix/report-terminalized-push-retries`

## Defect found

Investigation 335 added a terminalization path for inactive/deleted FCM tokens. The per-row result included `terminalized: true`, but the worker's aggregate response exposed only `tracked`, `deferred`, and failure counters. Scheduler/operator consumers that use aggregate fields could not distinguish successfully terminalized inactive tokens from other untracked sender outcomes without parsing every result row.

## Fix implemented

- Add top-level `terminalized` count for successful terminalization.
- Add top-level `terminalizationFailures` count for failed terminalization attempts.
- Keep per-row terminalization state and existing defer failure behavior.
- Add a regression contract and package script.

## Deployment boundary

This is a Supabase Edge Function source change. Cloudflare Pages remains the website deployment platform and does not deploy this function. No production Supabase mutation or Edge Function deployment was performed.
