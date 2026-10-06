/*
  Remove VATTAMS Online Tuition from the Home Services product.

  This migration intentionally removes only tuition-specific database objects.
  Existing Home Services tables, bookings, technicians, customers, payments,
  admin workflows, and technician employee IDs remain untouched.
*/

-- Remove tuition-specific triggers/functions first.
DROP FUNCTION IF EXISTS submit_trial_payment_utr(uuid, text);
DROP FUNCTION IF EXISTS admin_list_tuition_trial_requests(uuid);
DROP FUNCTION IF EXISTS admin_update_tuition_trial_status(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS admin_list_tuition_students(uuid, text);
DROP FUNCTION IF EXISTS admin_update_tuition_student_status(uuid, uuid, text);

DROP FUNCTION IF EXISTS compute_tuition_tutor_registration_fee();
DROP FUNCTION IF EXISTS assign_tutor_employee_id();
DROP FUNCTION IF EXISTS assign_student_id();
DROP FUNCTION IF EXISTS update_tuition_tutors_updated_at();
DROP FUNCTION IF EXISTS update_tuition_students_updated_at();
DROP FUNCTION IF EXISTS update_tuition_trial_requests_updated_at();
DROP FUNCTION IF EXISTS update_tuition_course_materials_updated_at();
DROP FUNCTION IF EXISTS update_tuition_courses_updated_at();
DROP FUNCTION IF EXISTS update_tuition_course_levels_updated_at();

-- Tuition tables only. CASCADE removes their indexes, policies,
-- triggers and foreign-key dependencies.
DROP TABLE IF EXISTS tuition_course_materials CASCADE;
DROP TABLE IF EXISTS tuition_course_levels CASCADE;
DROP TABLE IF EXISTS tuition_trial_requests CASCADE;
DROP TABLE IF EXISTS tuition_students CASCADE;
DROP TABLE IF EXISTS tuition_tutors CASCADE;
DROP TABLE IF EXISTS tuition_courses CASCADE;

-- Supabase Storage does not permit direct SQL deletion from storage.objects
-- or storage.buckets. Storage cleanup must be performed through the Storage
-- API/dashboard separately; keeping this migration SQL-only makes deployment
-- compatible with Supabase's storage protection.
-- Tuition database objects above are fully removed here.
