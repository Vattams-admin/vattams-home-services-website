# Investigation 343 — Fence stale social-settings cache responses

## Defect
`getSocialLinksSettings` memoized an in-flight request and `refreshSocialLinksCache` cleared the cache and promise references. If the original request completed after refresh, its completion handler could still write its older result into `cachedSettings`. It could also clear the promise belonging to a newer request. This allowed stale social links to survive an explicit refresh.

## Fix
Added a monotonically increasing cache generation. Each request captures its generation and may update the cache or clear the shared in-flight promise only while that generation is still current and the promise identity still matches. Refresh increments the generation before clearing state, fencing all earlier requests.

## Regression coverage
Added `scripts/social-settings-cache-invalidation-check.mjs` and `npm run test:social-settings-cache-invalidation`. The source-contract regression check verifies generation capture, stale-response fencing, promise identity fencing, refresh invalidation, and state clearing.

## Validation and deployment
- Regression script added; source contract inspected.
- Runtime execution, full typecheck, and full test suite have not been represented as passing unless separately executed.
- Cloudflare Pages preview is the sole website deployment gate. Merge is permitted only after a successful preview tied to the exact PR head SHA.
- Vercel and GitHub Actions deployment statuses are not gates.
- No Supabase production migration, Edge Function deployment, database mutation, or Firestore write was performed.
