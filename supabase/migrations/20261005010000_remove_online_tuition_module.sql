/*
  VATTAMS Home Services — remove the retired Online Tuition module.

  This migration intentionally removes only tuition-specific database objects
  and storage. Home Services tables, technician workflows, customer accounts,
  bookings, payments, and admin infrastructure are not touched.
*/

-- Remove tuition-specific storage policies/objects before deleting buckets.
DROP POLICY IF EXISTS "public_select_tuition_materials_protected" ON storage.objects;
DELETE FROM storage.objects
WHERE bucket_id IN ('tuition-materials-originals', 'tuition-materials-protected');

DELETE FROM storage.buckets
WHERE id IN ('tuition-materials-originals', 'tuition-materials-protected');

-- Remove tuition-specific tables. CASCADE also removes their tuition-only
-- indexes, policies and triggers.
DROP TABLE IF EXISTS public.tuition_trial_requests CASCADE;
DROP TABLE IF EXISTS public.tuition_course_materials CASCADE;
DROP TABLE IF EXISTS public.tuition_course_levels CASCADE;
DROP TABLE IF EXISTS public.tuition_students CASCADE;
DROP TABLE IF EXISTS public.tuition_tutors CASCADE;
DROP TABLE IF EXISTS public.tuition_courses CASCADE;

-- Remove tuition-only helper/RPC functions tracked by the retired module.
DROP FUNCTION IF EXISTS public.update_tuition_tutors_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_tuition_students_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_tuition_students(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_tuition_student_status(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_tuition_trial_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.submit_trial_payment_utr(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_tuition_trial_requests(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_tuition_trial_status(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_tuition_course_materials_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.compute_tuition_tutor_registration_fee() CASCADE;
DROP FUNCTION IF EXISTS public.update_tuition_courses_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_tuition_course_levels_updated_at() CASCADE;
