-- Home Services production security-advisor remediation.
-- Keep privileged RPCs callable by service-role-backed Edge Functions, but not
-- directly by PostgREST anon/authenticated roles. Trigger and event-trigger
-- routines continue to run through their existing trigger attachments.
-- Pin function name resolution so temporary schemas cannot shadow public names.

ALTER FUNCTION public.generate_student_code()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.recalc_available_balance(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.lock_deposit_on_approval()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.process_recharge_approval()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.update_notifications_updated_at()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.update_service_prices_updated_at()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.decrement_technician_workload(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.process_booking_completion()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.increment_coupon_usage(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.assign_technician_employee_id()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.update_payment_transactions_updated_at()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.academia_set_updated_at()
  SET search_path = pg_catalog, public, pg_temp;

-- These SECURITY DEFINER functions already had an explicit search_path, but
-- use the same hardened ordering consistently.
ALTER FUNCTION public.enforce_technician_registration_fee()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_admin_profile_by_email(text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.redeem_coupon_atomic(uuid, uuid, uuid, numeric)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.submit_tuition_tutor_payment_utr(text, text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.verify_admin_login(text, text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.rls_auto_enable()
  SET search_path = pg_catalog, public, pg_temp;

-- The current admin UI authenticates through the admin-auth Edge Function,
-- and customer/technician notifications and wallet changes use server-side
-- Edge Functions or database triggers. No client needs direct RPC execution.
-- Keep service_role's existing explicit grants intact.
REVOKE EXECUTE ON FUNCTION public.decrement_technician_workload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_technician_registration_fee() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_profile_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_deposit_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_booking_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_recharge_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_available_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_tuition_tutor_payment_utr(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC, anon, authenticated;

-- This is a legacy tuition view, not part of the Home Services product. Use
-- invoker rights defensively and remove its obsolete direct client access.
ALTER VIEW public.course_pricing SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public.course_pricing FROM PUBLIC, anon, authenticated;
