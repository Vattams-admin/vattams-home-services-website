# Security Audit 46 — Database RLS, Grants and RPC Boundaries

Audit date: 2026-10-31  
Branch: security/frontend-backend-contract-audit-2026-10-31  
Scope: Migration-defined Row Level Security, table grants/revokes, custom auth-session tables, SECURITY DEFINER functions, RPC EXECUTE grants and public catalog access.  
Method: Read-only review of tracked SQL migrations and relevant frontend queries. No production database catalog inspection or SQL execution was performed.

## Executive result

**NOT PRODUCTION READY — production policy state is not verified.**

The migration history contains meaningful hardening. It removes broad public CRUD policies from customer, technician, booking, payment, wallet, notification, OTP and other sensitive tables; revokes direct client grants; and moves privileged workflows behind service-role Edge Functions. Several privileged RPCs are explicitly restricted to service_role, and many SECURITY DEFINER routines have their search paths pinned.

Two repository-level gaps remain:
- The Booking page still directly queries service_categories and service_prices, but the later hardening migration drops their public SELECT policies while restoring SELECT grants without creating replacement SELECT policies. With RLS enabled, a SQL grant alone does not authorize rows; these catalog queries can fail/return no rows.
- A later SECURITY DEFINER OTP-attempt function was added after the central hardening migration and uses a less restrictive search_path setting (public only), rather than the hardened pg_catalog, public, pg_temp ordering used elsewhere.

The migration files do not prove which migrations are applied in production, whether any dashboard-created policies/grants exist, or whether production's effective grants match this repository.

## Findings

### F46-01 — MEDIUM: Public service catalog SELECT grants have no matching SELECT RLS policies after hardening

**Evidence**
- The initial schema migration enables RLS and creates public SELECT policies on service_categories and service_prices.
- supabase/migrations/20261010094000_close_public_table_access.sql explicitly drops public_select_service_categories and public_select_service_prices, revokes all client privileges, then grants SELECT on both tables to anon and authenticated.
- No later tracked migration recreates a SELECT policy for either service_categories or service_prices. The newer customer_service_prices table has its own explicit active-only SELECT policy in 20261010140000_customer_job_type_pricing.sql.
- src/pages/Booking.tsx still runs direct PostgREST queries for all three tables: service_categories, service_prices and customer_service_prices. It treats any category or price query error/missing data as a blocking catalogue load failure and clears the catalogue.

**Risk**
PostgreSQL grants determine whether a role may attempt SELECT, while RLS determines which rows it may see. With RLS enabled and no applicable SELECT policy, anon/authenticated roles cannot read rows even if table-level SELECT is granted. The Booking page may therefore fail to load its service categories or legacy price table. This is a security-hardening/availability mismatch rather than evidence of public data exposure.

**Remediation**
- Decide whether service_categories and service_prices are still required by the live booking flow.
- If required, add narrow SELECT policies (for example active rows only) and retain SELECT-only grants; do not restore public writes.
- If obsolete, remove the frontend queries and rely on the canonical customer_service_prices source after a tested migration.
- Add a migration-level policy/grant regression test and a live anon PostgREST read test before release.

### F46-02 — LOW: New SECURITY DEFINER OTP counter function does not follow the hardened search_path convention

**Evidence**
- supabase/migrations/20261010085000_harden_security_advisor_findings.sql standardizes a number of privileged functions to search_path = pg_catalog, public, pg_temp.
- The later migration supabase/migrations/20261025130000_atomic_otp_attempt_increment.sql creates public.increment_otp_attempt_count(uuid) as SECURITY DEFINER with SET search_path = public.
- The function explicitly qualifies its target table as public.otp_codes and its EXECUTE privilege is revoked from PUBLIC, anon and authenticated, then granted only to service_role.
- Other later transactional SECURITY DEFINER functions also use explicit public/pg_temp search paths; their table references are schema-qualified and EXECUTE is restricted to service_role.

**Risk**
The function is not publicly executable under the tracked grants and its table reference is schema-qualified, which materially limits exploitability. However, the search-path convention is inconsistent and leaves more name-resolution surface than necessary if objects or schema privileges change later. This is defense-in-depth debt, not evidence of a current unauthenticated exploit.

**Remediation**
- Standardize new SECURITY DEFINER functions to SET search_path = pg_catalog, public, pg_temp or an empty search_path with fully qualified references.
- Add a static migration lint that rejects SECURITY DEFINER functions without an approved safe search_path.
- Verify public schema CREATE privileges and effective function EXECUTE grants in production.

## Positive controls observed

1. The migration chain removes legacy public CRUD policies from bookings, customers, technicians and technician_jobs.
2. Payment, review and support-message public policies are removed and deny policies are added.
3. Notifications, technician notifications, FCM tokens and OTP tables are locked against anon/authenticated direct access.
4. Customer and technician custom session tables have RLS enabled and all table privileges revoked from anon/authenticated.
5. Admin custom session table has RLS enabled and client privileges revoked.
6. Wallet transactions, wallet recharges, wallet settings, technician documents and other operational tables have broad client privileges revoked.
7. Privileged RPCs including coupon redemption and atomic booking cancellation/job transition are explicitly restricted to service_role.
8. The old public coupon counter RPC is revoked from PUBLIC/anon/authenticated and restricted to service_role.
9. The admin credential RPC that was initially granted to anon/authenticated is later revoked from those roles in the hardening migration.
10. Multiple SECURITY DEFINER routines have search_path pinned by the central hardening migration.
11. The KYC storage migration removes anonymous overwrite and read policies for the private technician-docs bucket; its remaining anonymous create-only upload limitation is separately documented in Audit 41.

## Production verification gaps

- No connection to production pg_catalog, pg_policies, information_schema or Supabase Security Advisor was made.
- No proof that every migration in the repository has been applied in sequence.
- No inspection of dashboard-created policies, grants, default privileges, schema CREATE privileges or function owners.
- No live anon/authenticated PostgREST/RPC probes.
- No test of service_role bypass or Edge Function authorization in production.
- No SQL, migration, policy, grant, deployment, GitHub Actions run or merge was performed.

## Required release gates

1. Resolve the service_categories/service_prices SELECT policy mismatch and verify Booking catalogue loading.
2. Standardize SECURITY DEFINER search_path settings and lint future migrations.
3. Export and compare production effective grants, policies, function privileges and schema privileges against the repository.
4. Run anon/authenticated direct-table and RPC negative tests plus authorized Edge Function positive tests.
5. Verify all security migrations are applied and record the deployed migration version.

**Conclusion:** The repository demonstrates a substantial move away from public direct database access toward service-role-backed Edge Functions, with several explicit revokes and deny policies. The remaining catalog policy mismatch can block the booking catalogue, and one newer SECURITY DEFINER function falls short of the hardened search_path convention. Production RLS/grant state remains unverified. The marketplace remains **NOT PRODUCTION READY**.
