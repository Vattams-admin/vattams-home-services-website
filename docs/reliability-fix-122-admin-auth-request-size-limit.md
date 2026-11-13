# Reliability fix 122 — bound admin login request parsing

## Defect
The `admin-auth` Edge Function parsed login payloads with unbounded `req.json()`. A client could submit an arbitrarily large body before the handler validated credentials. Oversized password strings also reached bcrypt without an application-level length bound.

## Remediation
- Stream and cap the request body at 8 KB, checking both Content-Length and actual bytes read.
- Reject malformed UTF-8/JSON and non-object payloads with HTTP 400.
- Return HTTP 413 for oversized payloads.
- Require email and password to be strings; cap email at 254 characters and password at 128 characters before database lookup and bcrypt.
- Add a source-contract regression script and npm command.

## Validation boundary
The regression script is committed but has not yet been executed in a repository runtime. No Deno typecheck, Edge Function runtime test, or live endpoint test is claimed. No Supabase deployment, migration, production database mutation, or Firestore write was performed. Cloudflare Pages preview validates the website build/deployment only; it does not deploy this Supabase Edge Function.

## Release gate
Use Cloudflare Pages preview success for the exact current PR head SHA as the website merge gate. Ignore Vercel and GitHub Actions deployment statuses. Keep this PR open until exact-head Cloudflare success is confirmed.
