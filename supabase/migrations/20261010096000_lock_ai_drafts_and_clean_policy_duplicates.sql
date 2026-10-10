-- Complete server-mediated access for admin-only AI drafts and CRM reminders.
-- The new admin-data Edge Function handles these workflows with an active admin
-- session, so no anon/authenticated table grants or broad public policies remain.
DROP POLICY IF EXISTS "anon_all_ai_content_drafts" ON public.ai_content_drafts;
REVOKE ALL PRIVILEGES ON TABLE public.ai_content_drafts FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "anon_all_crm_reminders" ON public.crm_reminders;
REVOKE ALL PRIVILEGES ON TABLE public.crm_reminders FROM PUBLIC, anon, authenticated;

-- Remove redundant false policies. A single deny-all policy per table/action is
-- enough; multiple permissive false policies only add advisor noise.
DROP POLICY IF EXISTS "deny_public_customer_insert" ON public.customers;
DROP POLICY IF EXISTS "deny_public_customer_select" ON public.customers;
DROP POLICY IF EXISTS "deny_public_customer_update" ON public.customers;

DROP POLICY IF EXISTS "deny_delete_notifications_public" ON public.notifications;

DROP POLICY IF EXISTS "no_public_delete_payments" ON public.payments;
DROP POLICY IF EXISTS "no_public_insert_payments" ON public.payments;
DROP POLICY IF EXISTS "no_public_update_payments" ON public.payments;

DROP POLICY IF EXISTS "deny_delete_reviews_public" ON public.reviews;
DROP POLICY IF EXISTS "deny_delete_support_messages_public" ON public.support_messages;
DROP POLICY IF EXISTS "deny_delete_technician_jobs_public" ON public.technician_jobs;
DROP POLICY IF EXISTS "deny_delete_technician_notifications_public" ON public.technician_notifications;

-- Both constraints enforce the same UNIQUE(booking_id). Keep the canonical
-- reviews_booking_id_key constraint and remove the redundant duplicate index.
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_unique;
