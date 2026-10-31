# Security Audit 32 — Technician Authorization, Job Privacy, Wallet Data and Notifications

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Reviewed branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Technician custom sessions, technician-owned job visibility, customer PII in job records, job state transitions, wallet/recharge data, and notification ownership/reference validation.  
**Audit type:** Read-only source review. No application code, SQL, secrets, production data, or deployment settings were changed.

## Executive summary

The technician API has meaningful ownership controls: it authenticates an opaque session token, resolves the technician ID server-side, rejects protected actions for non-active accounts, scopes job reads by `technician_id`, and scopes wallet/recharge/notification reads to the authenticated technician. The sensitive-table migration also denies direct anon/authenticated access to `technicians` and `technician_jobs`.

However, this review found **two high-priority issues** and several medium-priority hardening gaps:

1. **HIGH — A stale technician can reject a job after reassignment and clear the new technician's booking assignment.** The atomic transition RPC deliberately skips the booking-assignment consistency check for every `rejected` request. It then unconditionally resets the booking to pending and clears `assigned_technician_id`. A former assignee can therefore mutate a booking currently assigned to another technician if the former technician still owns the old job row.
2. **HIGH — Historical job responses retain customer phone/address indefinitely.** The technician account endpoint returns every job row assigned to that technician, including completed/rejected history, with `customer_mobile` and `customer_address`. No time-bounded access or post-completion redaction is visible in the reviewed endpoint. This exposes customer PII beyond the active service need.
3. **MEDIUM — Technician sessions are not revoked by client logout and are stored as raw bearer tokens.** The frontend logout only removes sessionStorage values. The server session remains valid for up to seven days; no technician logout/revoke action is present in the reviewed endpoint.
4. **MEDIUM — Wallet transaction and recharge APIs return unrestricted `select("*")` rows.** The queries are technician-scoped, but response fields are not allowlisted and may expose internal references, reviewer notes, or future-added columns.
5. **MEDIUM — Login reveals account existence and has no visible handler-level failed-login throttle.** Different 404/401/400 responses distinguish unknown account, wrong password and unset password. No per-account/IP/device login throttling is visible in this function. Upstream rate limiting was not inspected.
6. **MEDIUM — Notification reference IDs are not generally validated against the recipient's ownership.** Notification creation correctly limits a technician session to sending to that same technician, and booking-action-token guest creation is narrowly constrained. But authenticated customer/technician/admin notification creation accepts arbitrary reference_type/reference_id values without checking that the referenced booking/job belongs to the recipient or is of a compatible type.
7. **MEDIUM — Technician status transition API and SQL transition graph disagree.** The edge handler allows `job_completed` directly from `in_progress`, but the SQL RPC permits only `job_started` or `completed` from that state. The edge handler also permits `job_started` from `in_progress`, while the SQL graph allows that. The UI offers both labels. This creates a server-side 500 for an edge-accepted transition and an inconsistent workflow contract.

## Detailed findings

### 32.1 HIGH — Former technician can reject a job after reassignment

**Evidence**
- `supabase/migrations/20261031170000_atomic_booking_cancellation_and_job_transitions.sql`
  - The RPC selects the job using both `id = p_job_id` and `technician_id = p_technician_id`.
  - The booking-assignment mismatch guard is conditional: it raises only when `assigned_technician_id` differs **and** the requested status is not `rejected`.
  - On every accepted rejection transition, it sets the job status to rejected, booking status to pending, and `assigned_technician_id = NULL`.
- `supabase/functions/technician-data/index.ts` authenticates the current technician session and passes the server-resolved technician ID to `transition_technician_job_atomic`.

**Impact**
If a booking was reassigned to Technician B while Technician A's old job row remains, Technician A can still authenticate and reject that old job. The RPC bypasses the mismatch check for rejection and clears the booking's current assignment, disrupting Technician B's active assignment. This is a cross-account integrity issue even though Technician A cannot read Technician B's job row.

**Required remediation**
- Require `bookings.assigned_technician_id = p_technician_id` for rejection too.
- If stale-job cleanup is needed, provide a separate admin/service-only operation with explicit expected-assignee/version checks.
- Add a regression test: assign A, reassign to B, then attempt A's rejection; it must fail and leave B's assignment and booking status unchanged.

### 32.2 HIGH — Customer contact/address retained in all technician job history

**Evidence**
- `supabase/functions/technician-data/index.ts` account action queries all `technician_jobs` rows with `.eq("technician_id", technicianId)`, with no status or age filter.
- The select list includes `customer_mobile` and `customer_address` for every returned row.
- The dashboard stores and renders the full job collection; no separate active-job versus historical-job API boundary is visible in the reviewed source.

**Impact**
A technician can continue retrieving customer phone numbers and full addresses from completed/rejected historical jobs for as long as those rows remain associated with their technician ID and session remains valid. These fields are operationally necessary for an active assignment, but the source does not show a retention boundary or minimization once the job is closed.

**Required remediation**
- Return full contact/address only for currently active assigned jobs and only for the authenticated assignee.
- For completed/rejected jobs, return a reduced DTO (e.g. masked phone and locality-only address), or enforce a documented short post-completion access window where legally/operationally required.
- Consider a separate explicit job-detail action that rechecks current assignment and status before returning contact data.
- Add tests proving historical records do not expose full customer contact fields.

### 32.3 MEDIUM — Logout does not revoke technician session; raw token at rest

**Evidence**
- `technician-auth.handleLogin` creates a 64-hex-character opaque token (two UUID strings concatenated), stores it directly in `technician_auth_sessions.token`, and sets a seven-day expiry.
- `technician-data.auth` looks up the raw token and checks expiry.
- `src/pages/TechnicianDashboard.tsx` logout removes browser sessionStorage entries only.
- No logout/revoke action is present in the reviewed `technician-data` action switch.

**Impact**
A copied/stolen token remains usable until expiry or until another login deletes the technician's existing session row. Client-side logout does not invalidate a token already copied from the browser.

**Required remediation**
- Add a server-side logout action that deletes/revokes the current session and call it before clearing local storage.
- Hash session tokens at rest (store a cryptographic digest and compare digest values); never return or log them.
- Consider shorter expiry and rotation/revocation on password change, suspension, and credential recovery.
- Add tests for logout revocation, expiry and replay.

### 32.4 MEDIUM — Wallet and recharge response DTOs use select-star

**Evidence**
- Technician account action queries:
  - `wallet_transactions.select("*").eq("technician_id", technicianId)`
  - `wallet_recharges.select("*").eq("technician_id", technicianId)`
- Both are correctly scoped to the authenticated technician and bounded to 20 and 10 rows respectively.

**Impact**
Ownership filtering is positive, but `select("*")` makes the client response expand automatically when schema columns are added. Internal reconciliation references, admin-only notes, processor metadata or future sensitive fields could be exposed without a code change to this endpoint.

**Required remediation**
- Replace wildcard selection with explicit technician-safe field lists.
- Define typed response DTOs and test that admin-only/internal columns are absent.
- Keep payment references masked or limited to the minimum needed for the technician to identify their own recharge.

### 32.5 MEDIUM — Login account enumeration and missing visible failed-login throttle

**Evidence**
- `technician-auth.handleLogin` returns 404 when no account is found, 400 when a password is not set, and 401 for an incorrect password.
- No failed-attempt counter, cooldown, account lock, or per-IP/device throttle is visible in this handler.

**Impact**
Responses disclose whether a mobile/email belongs to a technician account and whether a password is configured. Repeated password guessing is not limited by a visible application-level control in this function.

**Required remediation**
- Use a uniform login failure response for unknown account, unset password and wrong password.
- Add durable per-account plus IP/device throttling, with progressive delay and alerting.
- Confirm any Cloudflare/WAF rate limits independently; this source audit cannot determine whether upstream controls exist.

### 32.6 MEDIUM — Notification reference IDs are not ownership-validated

**Evidence**
- `supabase/functions/notification-ops/index.ts` authenticates the sender:
  - technician session can create only for its own technician ID;
  - customer session must match the customer mobile;
  - active super-admin session authorizes admin creation;
  - guest booking action token is restricted to a `booking_received` notification whose reference type, booking ID and recipient mobile match that booking.
- For authenticated sessions, the inserted `reference_type` and `reference_id` are copied from client input without a lookup confirming the referenced booking/job belongs to the recipient.
- The row is inserted with `select("*")` and returned to the caller.

**Impact**
A recipient can create a notification addressed to themselves but containing a reference to an unrelated booking/job. Depending on how clients interpret notification references, this can create misleading links or expose existence/metadata through downstream detail navigation. The current read path remains recipient-scoped.

**Required remediation**
- Validate reference type against an allowlist and load the referenced record server-side.
- Enforce recipient ownership and compatible event/type for each reference (technician → assigned job; customer → owned booking; admin → allowed administrative references).
- Return an explicit notification DTO rather than `select("*")`.
- Add negative tests for cross-recipient and nonexistent reference IDs.

### 32.7 MEDIUM — Job transition contract mismatch

**Evidence**
- `supabase/functions/technician-data/index.ts` allows requested statuses: accepted, rejected, on_the_way, in_progress, job_started, job_completed, completed.
- `transition_technician_job_atomic` permits:
  - in_progress → job_started or completed;
  - job_started → job_completed or completed;
  - job_completed → completed.
- Therefore in_progress → job_completed is rejected by SQL although the edge handler accepts it and the UI exposes it as a selectable status.

**Impact**
The API contract is inconsistent and can produce confusing transition failures. This is primarily a reliability/state-machine defect, not evidence of unauthorized state mutation.

**Required remediation**
- Define one canonical transition graph and share it in edge validation, SQL and UI.
- Remove unreachable transitions or deliberately support them in the RPC.
- Add transition-matrix tests covering every allowed and denied edge.

## Positive controls verified in source

- Technician ID is derived from a server-side session lookup, not trusted from request body.
- Protected technician actions require the technician account to be active.
- Job reads are filtered by authenticated technician ID.
- Job status changes use a row-locked atomic RPC and verify the job's technician owner.
- Direct anon/authenticated access to `technicians` and `technician_jobs` is denied by the reviewed migration.
- Wallet/recharge queries are filtered by authenticated technician ID and bounded in count.
- Technician notification read/update queries are scoped to the authenticated technician ID or recipient ID.
- Realtime subscription to custom-session notification rows is intentionally disabled.
- Technician login removes `password_hash` from the response object before returning account data.

## Validation performed and limitations

- Read-only review of the branch source files listed above.
- No code or SQL was changed.
- No Deno unit tests, SQL integration tests, concurrency tests, RLS policy simulation, schema inspection against a live database, or production API tests were run.
- No production database access or migration was performed.
- No GitHub Actions workflow was triggered or modified.
- No Cloudflare deployment was performed.
- This report does not establish that the reviewed branch is deployed or that its migrations have been applied in production.

## Release status

**NOT PRODUCTION READY — technician authorization/privacy blockers remain.**

Release blockers from this audit:
1. Fix stale-assignee rejection in the atomic transition RPC and add a reassignment regression test.
2. Minimize/redact historical customer contact/address data in technician job responses.
3. Add server-side session revocation and protect stored session tokens.
4. Replace wallet/recharge wildcard selects with explicit DTOs.
5. Validate notification reference ownership.
6. Align and test the job transition graph.
7. Add login throttling and generic failure responses, and verify upstream rate limits.

This audit is report-only. No deployment, database migration, PR merge, or workflow run was performed.
