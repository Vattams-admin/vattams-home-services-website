-- Close legacy permissive direct access paths in the Home Services database.
-- All customer, technician, booking, payment, and coupon workflows use
-- service-role-backed Edge Functions. Keep the two public catalog tables
-- read-only for the website, and only expose active service prices.

-- The old technician policies were permissive; a separate false policy does
-- not override them (permissive policies are combined with OR).
DROP POLICY IF EXISTS "Allow technician registration" ON public.technicians;
DROP POLICY IF EXISTS "Allow anon users to view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Allow authenticated users to view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Allow anon update technicians" ON public.technicians;
DROP POLICY IF EXISTS "deny_delete_technicians_public" ON public.technicians;
REVOKE ALL PRIVILEGES ON TABLE public.technicians FROM PUBLIC, anon, authenticated;

-- The old coupon policies allowed public reads and forged redemption rows.
DROP POLICY IF EXISTS "anon_insert_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "anon_select_redemptions" ON public.coupon_redemptions;
REVOKE ALL PRIVILEGES ON TABLE public.coupon_redemptions FROM PUBLIC, anon, authenticated;

-- Customer data is accessed through the authenticated customer-data Edge Function.
REVOKE ALL PRIVILEGES ON TABLE public.customers FROM PUBLIC, anon, authenticated;

-- These student/enrollment policies belong to the retired online-tuition flow.
-- Keep the tables/data for audit/retention, but remove all direct client access.
DROP POLICY IF EXISTS "students_insert_own" ON public.students;
DROP POLICY IF EXISTS "students_select_own" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;
DROP POLICY IF EXISTS "enrollments_select_own" ON public.enrollments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
REVOKE ALL PRIVILEGES ON TABLE public.students, public.enrollments, public.payments
  FROM PUBLIC, anon, authenticated;

-- The public website only needs catalog reads. Remove the duplicate unfiltered
-- service-price policy so inactive prices cannot be queried through PostgREST.
DROP POLICY IF EXISTS "public_select_service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "public_select_service_prices" ON public.service_prices;
REVOKE ALL PRIVILEGES ON TABLE public.service_categories, public.service_prices
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.service_categories, public.service_prices TO anon, authenticated;

-- Additional server-mediated operational tables. These have no direct client
-- queries in the Home Services app; Edge Functions use service_role instead.
DROP POLICY IF EXISTS "anon_all_analytics_snapshots" ON public.analytics_snapshots;
REVOKE ALL PRIVILEGES ON TABLE public.analytics_snapshots FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_complaints" ON public.complaints;
REVOKE ALL PRIVILEGES ON TABLE public.complaints FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_fcm_tokens" ON public.fcm_tokens;
REVOKE ALL PRIVILEGES ON TABLE public.fcm_tokens FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_technician_attendance" ON public.technician_attendance;
REVOKE ALL PRIVILEGES ON TABLE public.technician_attendance FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_technician_documents" ON public.technician_documents;
REVOKE ALL PRIVILEGES ON TABLE public.technician_documents FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_emergency_contacts" ON public.technician_emergency_contacts;
REVOKE ALL PRIVILEGES ON TABLE public.technician_emergency_contacts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_all_leave_requests" ON public.technician_leave_requests;
REVOKE ALL PRIVILEGES ON TABLE public.technician_leave_requests FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_delete_applications" ON public.technician_applications;
DROP POLICY IF EXISTS "anon_insert_applications" ON public.technician_applications;
DROP POLICY IF EXISTS "anon_select_applications" ON public.technician_applications;
DROP POLICY IF EXISTS "anon_update_applications" ON public.technician_applications;
REVOKE ALL PRIVILEGES ON TABLE public.technician_applications FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_delete_training_videos" ON public.technician_training_videos;
DROP POLICY IF EXISTS "anon_insert_training_videos" ON public.technician_training_videos;
DROP POLICY IF EXISTS "anon_select_training_videos" ON public.technician_training_videos;
DROP POLICY IF EXISTS "anon_update_training_videos" ON public.technician_training_videos;
REVOKE ALL PRIVILEGES ON TABLE public.technician_training_videos FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "public_delete_wallet_recharges" ON public.wallet_recharges;
DROP POLICY IF EXISTS "public_insert_wallet_recharges" ON public.wallet_recharges;
DROP POLICY IF EXISTS "public_select_wallet_recharges" ON public.wallet_recharges;
DROP POLICY IF EXISTS "public_update_wallet_recharges" ON public.wallet_recharges;
REVOKE ALL PRIVILEGES ON TABLE public.wallet_recharges FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "public_select_wallet_settings" ON public.wallet_settings;
REVOKE ALL PRIVILEGES ON TABLE public.wallet_settings FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "public_delete_wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "public_insert_wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "public_select_wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "public_update_wallet_transactions" ON public.wallet_transactions;
REVOKE ALL PRIVILEGES ON TABLE public.wallet_transactions FROM PUBLIC, anon, authenticated;

-- The notification UI reads and mutates these records through authenticated
-- Edge Function actions, never through direct PostgREST table access.
REVOKE ALL PRIVILEGES ON TABLE public.notifications, public.technician_notifications
  FROM PUBLIC, anon, authenticated;

-- Legacy education catalog tables are not part of Home Services.
DROP POLICY IF EXISTS "categories public read" ON public.categories;
DROP POLICY IF EXISTS "lessons public read" ON public.course_lessons;
DROP POLICY IF EXISTS "modules public read" ON public.course_modules;
REVOKE ALL PRIVILEGES ON TABLE public.categories, public.course_lessons, public.course_modules
  FROM PUBLIC, anon, authenticated;

-- Site settings remain public-read, but all writes go through admin-data.
DROP POLICY IF EXISTS "public_delete_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "public_write_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "public_update_site_settings" ON public.site_settings;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;

-- Audit events can still be appended by the existing client logger, but cannot
-- be read, rewritten, or deleted by public roles.
DROP POLICY IF EXISTS "anon_select_audit_logs" ON public.audit_logs;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;

-- The legacy chat client module is not imported by the current app. Chat records
-- must not be exposed through anonymous PostgREST/Realtime subscriptions.
DROP POLICY IF EXISTS "public_delete_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "public_insert_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "public_select_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "public_update_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_all_chat_attachments" ON public.chat_attachments;
DROP POLICY IF EXISTS "anon_all_chat_typing" ON public.chat_typing;
REVOKE ALL PRIVILEGES ON TABLE public.chat_messages, public.chat_attachments, public.chat_typing
  FROM PUBLIC, anon, authenticated;
