# Investigation 334 — Push Sender Runtime Type Validation

Date: 2026-11-06  
Repository: `Vattams-admin/vattams-home-services-website`  
Branch: `fix/push-request-runtime-string-validation`

## Defect found

The push sender trusted its TypeScript `PushRequest` interface at runtime. JSON request bodies are untrusted and can contain values such as numeric `title` / `body`, object-valued `userId`, or non-string notification/token IDs. The existing guard invoked optional `.trim()` and regular-expression `.test()` without checking runtime types. A malformed title or body could throw a TypeError and fall through to the generic HTTP 500 handler instead of being rejected as an invalid request (HTTP 400). The declared TypeScript type does not validate parsed JSON.

## Fix implemented

- Require `userId`, `title`, and `body` to be non-empty strings before calling `.trim()`.
- Require optional `notificationId` and each `fcmTokenIds` entry to be strings before UUID validation.
- Keep the existing request limits and notification-data object validation unchanged.
- Add a regression contract that checks runtime type guards precede string operations.

## Validation boundary

The change is committed to a feature branch and awaits repository checks plus a Cloudflare Pages preview. No production Supabase Edge Function was deployed and no database, Storage policy, scheduler, or production data was changed. Cloudflare Pages deploys the website; this Supabase Edge Function change requires its own separately authorized backend rollout.
