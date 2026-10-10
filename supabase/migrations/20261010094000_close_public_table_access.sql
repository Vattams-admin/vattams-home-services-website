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
