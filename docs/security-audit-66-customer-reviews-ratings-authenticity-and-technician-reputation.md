# Security Audit 66 — Customer Reviews, Ratings, Review Authenticity and Technician Reputation Manipulation

**Repository:** `Vattams-admin/vattams-home-services-website`  
**Branch:** `security/frontend-backend-contract-audit-2026-10-31`  
**Review type:** Read-only source review  
**Overall status:** **NOT PRODUCTION READY**

## Scope

Reviewed:
- `supabase/functions/customer-auth/index.ts` — `submit-review` handler.
- `supabase/functions/customer-data/index.ts` — customer review reads.
- `src/pages/CustomerReviews.tsx` — customer review submission and rendering.
- `src/lib/supabase.ts` — Review type.
- `supabase/migrations/20260728205726_create_reviews_and_reschedule_system.sql` — review table, constraints and original RLS policies.
- `supabase/functions/admin-data/index.ts` — review analytics and administrator review-related surface.

## Executive result

**New findings: 0.** The active review submission handler validates a live customer session against the supplied customer ID, checks that the booking belongs to that customer and is completed, derives the technician from the booking, validates a 1–5 integer rating, and handles the unique-booking constraint. The schema's unique constraint on `booking_id` is an important duplicate-review safeguard.

The server does not enforce a maximum length for `review_text`; the UI's 2,000-character limit is client-side only. This is a previously recorded Audit 31 carryover and is not counted again. The technician average rating update is a separate non-transactional read/compute/write sequence, so concurrent submissions may leave the stored aggregate stale; this needs transactional recalculation or a database-maintained aggregate.

## Controls observed

### Customer identity and booking eligibility

- `submit-review` loads `customer_auth_sessions` by the submitted session token and rejects missing or expired sessions.
- It requires the session's `customer_id` to equal the supplied `customer_id`.
- It loads the reviewer's display name from the customer record identified by the authenticated session.
- It loads the target booking and requires the booking's `customer_id` to match the submitted customer ID.
- It rejects a review unless the booking status is exactly `completed`.
- It derives `finalTechId` from `bookings.assigned_technician_id`; if the client also supplies a technician ID, a mismatch is rejected.
- The inserted `customer_name` and `technician_id` are populated from server-loaded records rather than trusting the client display name or technician assignment.

### Rating and duplicate safeguards

- The server converts the rating to a number and requires an integer from 1 through 5.
- The migration defines `rating int NOT NULL CHECK (rating >= 1 AND rating <= 5)`.
- The migration defines `booking_id uuid UNIQUE NOT NULL`, enforcing at most one review per booking at the database level.
- The handler performs an early existing-review lookup for a friendly response and separately handles database unique-violation code `23505`, so concurrent duplicate submissions are rejected by the database constraint.
- Customer review reads in `customer-data` are scoped to the session-derived customer ID.

### Reputation calculation

- After inserting a review, the handler reads all ratings for the assigned technician, calculates the arithmetic average and updates `technicians.rating`.
- The rating calculation is based on review rows for that technician, not on a client-supplied aggregate.
- However, the read/compute/write sequence is not atomic in the reviewed handler. Two concurrent submissions can calculate from different snapshots and write out of order, leaving the stored technician rating stale until another review is submitted or a recalculation occurs.

## Carry-forward items — unresolved, not counted again

### C66-01 — Review text has no explicit server-side maximum length

**Original finding:** Audit 31.  
The customer review UI limits the text area to 2,000 characters and slices the submitted value to 2,000 characters. The `submit-review` handler accepts `review_text` and inserts it without repeating a server-side type, normalization or maximum-length check. A caller can bypass browser constraints and submit oversized or unexpected review text. Enforce a server-side string type, trim policy, maximum length and control-character policy.

### C66-02 — Public review-table policy history requires deployed-state verification

The original review migration enabled RLS but created anon/authenticated SELECT, INSERT, UPDATE and DELETE policies with unrestricted predicates. Later security migrations may supersede these historical policies; this audit did not verify the complete final policy/grant state or production deployment. The active customer-facing insert path uses the service-role Edge Function, so direct table access should be explicitly revoked and the deployed policy state verified. This is a migration/deployment verification carryover, not a claim that the original policies are necessarily still effective.

### C66-03 — Reputation aggregate update is not transactionally coupled to review insertion

The current handler inserts the review, then independently reads all technician ratings and updates the technician aggregate. The reviewed code does not check the aggregate update error, and concurrent review submissions can race. Use a database trigger or atomic aggregate-maintenance RPC with deterministic recalculation and failure monitoring. This is recorded as a hardening recommendation; no separate severity finding is assigned in this audit because the underlying stored review remains the authoritative record and the aggregate can be recalculated.

## Remediation priorities

1. Enforce server-side review text type, maximum length and normalization; do not rely on the browser's 2,000-character limit.
2. Maintain technician rating aggregates through an atomic database operation or trigger; record and monitor aggregate-update failures.
3. Verify the full migration sequence and production RLS/grants for `reviews`; ensure anon/authenticated cannot directly insert, update or delete review records.
4. Consider a controlled moderation/reporting process for abusive, unlawful or privacy-invasive review content, with reason-coded moderation events and appeal/audit history.
5. Add tests for cross-customer booking IDs, incomplete/cancelled bookings, mismatched technician IDs, invalid ratings, oversized review text, duplicate concurrent submissions and concurrent technician rating updates.
6. Preserve the existing booking ownership check, completed-booking requirement, server-derived technician assignment and unique booking constraint.

## Verification limits

This is a source-code and migration-history review of the named branch only. No live review submissions, database constraints, production RLS/grants, moderation actions, technician rating aggregates or concurrent requests were queried or tested. No SQL, database change, migration, build, automated test, deployment, GitHub Actions run, or branch merge was performed. This report does not establish that deployed infrastructure matches the reviewed source.

## Release decision

**NOT PRODUCTION READY.** Review ownership, completed-booking eligibility, rating range validation and duplicate prevention are positive controls. Server-side review-text validation, deployed table-access verification and reliable atomic reputation aggregation remain necessary.
