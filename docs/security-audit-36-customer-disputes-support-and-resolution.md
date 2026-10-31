# Security Audit 36 — Customer Disputes, Support Escalation and Resolution Authorization

**Audit date:** 2026-10-31  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Scope:** Customer support submission, support-message privacy, dispute intake, complaint ownership, admin resolution workflow, evidence retention, escalation and auditability.  
**Method:** Read-only inspection of repository source and migration history. No production database, live RLS policy state, deployed Edge Function, support inbox, or Cloudflare configuration was accessed.

## Executive result

**Release status: NOT PRODUCTION READY.**

The customer support Edge Function requires a valid customer session and derives customer identity from that session before inserting a support message. That is a useful API-level ownership control.

However, the original `support_messages` migration creates unrestricted anon/authenticated SELECT, INSERT, UPDATE and DELETE RLS policies. The later public-table closure and security-hardening migrations inspected do not mention `support_messages`. If those policies remain deployed, direct table access can bypass the authenticated support endpoint and expose or tamper with customer complaints. In addition, the reviewed application code provides no complete admin complaint-resolution, dispute evidence, escalation or immutable audit workflow.

## Findings

### F36-01 — CRITICAL: Support messages have unrestricted public table policies in migration history

**Evidence**
- `supabase/migrations/20260728210113_create_support_messages_table.sql` enables RLS on `support_messages`.
- It creates `public_select_support` for anon and authenticated with `USING (true)`.
- It creates `public_insert_support` with `WITH CHECK (true)`.
- It creates `public_update_support` with `USING (true) WITH CHECK (true)`.
- It creates `public_delete_support` with `USING (true)`.
- The inspected later migrations `20261010085000_harden_security_advisor_findings.sql` and `20261010094000_close_public_table_access.sql` contain no support_messages policy/grant changes.

**Risk**
If these policies remain deployed, a caller using the public anon key may be able to read all support messages, submit forged messages, modify another customer's complaint/status/response, or delete complaint records. RLS being enabled does not make a table private when its policies explicitly allow every row.

**Required remediation**
- Add a new migration that drops all four public support policies.
- Revoke direct anon/authenticated table privileges and grant only the minimum required roles.
- Keep customer complaint creation behind the customer-data Edge Function or a narrowly scoped RPC that verifies the customer session and binds customer_id server-side.
- Implement customer-specific read access only through a verified session and ownership check.
- Keep admin read/update access behind server-side admin/finance/support authorization.
- Verify deployed policies and grants from the live database before release; repository migrations alone cannot prove deployed state.

### F36-02 — HIGH: No complete admin support inbox or complaint-resolution API was found in reviewed source

**Evidence**
- `supabase/functions/customer-data/index.ts` exposes a `support` action that inserts a support row with status `open`.
- The inspected `supabase/functions/admin-data/index.ts` does not expose support-message list, assign, respond, close, reopen, escalate or resolve actions.
- The inspected support table schema contains `status` and `admin_response`, but no assigned agent, priority, category, resolution code, escalation timestamp or resolved timestamp.
- The support-message schema allows only `open`, `responded`, and `closed`.

**Risk**
A customer can submit a complaint, but the reviewed code does not establish a controlled end-to-end workflow for staff ownership, investigation, response, resolution, reopening or escalation. A status field alone is not a case-management process.

**Required remediation**
- Implement a role-protected support queue with assignment, priority, category, status, due date/SLA, escalation and resolution fields.
- Define legal state transitions and enforce them server-side.
- Require staff identity and resolution reason for every status change.
- Provide customer-visible case status and response history.
- Add operational metrics for backlog, overdue cases, reopen rate and resolution time.

### F36-03 — HIGH: Complaint evidence and dispute documentation are not modelled

**Evidence**
- The reviewed `support_messages` table stores subject and message text only, plus customer name/mobile, status, admin response and creation time.
- No attachment/evidence table, private evidence-storage path, evidence ownership check, content type/size restriction, malware scanning status, or retention metadata was found in the reviewed schema.
- No dispute-specific relationship to booking, payment, refund or technician job is represented in the support row.

**Risk**
Customer disputes commonly require booking, payment, service, communication or photo evidence. The reviewed schema does not establish secure evidence intake, provenance, access control or retention. Storing sensitive evidence in unrestricted or public storage would create additional privacy risk.

**Required remediation**
- Add explicit case-to-booking/payment/job references with server-side ownership validation.
- Store evidence in a private bucket with per-case authorization and short-lived signed access.
- Validate file type, size and content; scan uploads; record uploader, upload time, checksum and evidence metadata.
- Define retention, legal-hold and deletion rules; preserve evidence needed for active disputes.
- Prevent public table/storage access and prevent support staff from accessing unrelated customer documents.

### F36-04 — MEDIUM: Support submission lacks visible input bounds, abuse controls and durable acknowledgement

**Evidence**
- The customer-data `support` action trims `subject` and `message` but does not enforce visible maximum lengths, minimum content, attachment limits or per-customer submission throttles.
- The action returns only `{success:true}`; it does not return a case number or durable receipt identifier.
- The support schema has no visible idempotency key or duplicate-submission control.

**Risk**
Unbounded text can be used for storage/resource abuse and can create operationally unusable complaints. Network retries can create duplicate cases, and customers have no returned case reference in this API response for follow-up.

**Required remediation**
- Enforce strict server-side subject/message length limits and reject empty/whitespace-only content.
- Apply per-customer, per-IP and global rate limits with spam/abuse monitoring.
- Add an idempotency key and safe duplicate submission handling.
- Return a stable case number and creation timestamp.
- Escape/render untrusted complaint text safely in staff tools and notifications.

### F36-05 — MEDIUM: No immutable complaint activity log, staff accountability or resolution evidence is demonstrated

**Evidence**
- The reviewed support schema has a mutable `status` and `admin_response` field, plus `created_at`.
- It does not define an append-only case event/history table with actor, action, prior state, new state, reason and timestamp.
- The reviewed admin API has no support-specific role or action-level authorization.
- No resolution evidence or customer acknowledgement is represented in the reviewed support schema.

**Risk**
A mutable row cannot reliably reconstruct who changed a complaint, what was communicated, whether a case was reopened, or why a refund/compensation decision was made. This weakens accountability and dispute defence.

**Required remediation**
- Add append-only case events for creation, assignment, internal note, customer response, escalation, status change and resolution.
- Record actor ID/role, event time, correlation ID, reason and immutable before/after state.
- Separate internal notes from customer-visible responses.
- Require reason/evidence for closure and allow controlled reopening.
- Retain audit events according to a documented legal/operational retention policy.

### F36-06 — MEDIUM: Complaint and review data have different intended visibility, but review table history also includes public mutation policies

**Evidence**
- `supabase/migrations/20260728205726_create_reviews_and_reschedule_system.sql` creates public anon/authenticated SELECT, INSERT, UPDATE and DELETE policies on `reviews`.
- A later migration `20261006162000_enforce_one_review_per_booking.sql` adds one-review-per-booking enforcement, but the inspected later public-access closure migration does not mention reviews.
- The customer-data API reads reviews filtered by authenticated customer ID, but direct table policies are a separate access path.

**Risk**
The one-review-per-booking constraint prevents duplicate rows for a booking, but it does not itself prove that only the booking owner can create or edit the review, or that other customers cannot read/delete review records through direct table access. This affects complaint/dispute integrity and customer privacy.

**Required remediation**
- Drop broad public review mutation/read policies and revoke direct anon/authenticated access.
- Route review creation through a server-side ownership check that verifies the booking belongs to the customer and is completed.
- Define the intended public display fields separately from private review metadata.
- Verify deployed RLS and grants; add tests for cross-customer read/update/delete and review spoofing.

## Positive controls observed

1. Customer-data authenticates the supplied customer session and resolves the customer ID server-side before dispatching actions.
2. The support submission action derives customer ID, name and mobile from the authenticated customer record rather than trusting caller-supplied identity fields.
3. Support submissions are initially assigned status `open`.
4. The customer API returns only a success indicator after insert and does not return the inserted support row or unrelated customer records.
5. Customer account and review reads in the inspected customer-data handler are filtered by authenticated customer ID.
6. The schema uses a foreign key from support_messages.customer_id to customers.id with `ON DELETE SET NULL`, preserving the support row if a customer record is deleted.

## Verification not performed

- No live Supabase RLS policy or grant inspection.
- No production database connection or migration application.
- No direct anon-key table access test.
- No support inbox UI or deployed admin workflow test.
- No attachment upload/storage policy or malware-scanning test.
- No rate-limit, spam, concurrency, idempotency or abuse tests.
- No legal retention or consumer-dispute policy review.
- No Cloudflare deployment or GitHub Actions workflow was run.

## Required release gates

1. Remove unrestricted public SELECT/INSERT/UPDATE/DELETE policies and verify deployed grants.
2. Build authenticated customer and role-protected staff case workflows.
3. Implement secure evidence intake, private storage, retention and access logging.
4. Add server-side input bounds, abuse limits, idempotency and case-number acknowledgement.
5. Add immutable activity history, staff accountability and controlled resolution/reopen actions.
6. Harden review table policies and test cross-customer access.
7. Add automated RLS, Edge Function, storage and end-to-end dispute workflow tests.

**Conclusion:** Audit 36 is complete as a repository-source review. The support API has an authenticated submission path, but the migration history contains critical public access policies and the reviewed code does not establish a complete complaint-resolution system. The marketplace remains **NOT PRODUCTION READY**.
