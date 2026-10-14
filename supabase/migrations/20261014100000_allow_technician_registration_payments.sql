-- The payments table predates the Home Services payment flow and also serves
-- legacy education payments. Those legacy columns must be nullable for a
-- technician registration fee, which has no student/course/enrollment.
-- Keep all existing rows and foreign keys intact.
ALTER TABLE public.payments
  ALTER COLUMN student_id DROP NOT NULL,
  ALTER COLUMN course_id DROP NOT NULL;

-- These nullable fields are optional for the technician payment-auth flow.
ALTER TABLE public.payments
  ALTER COLUMN payment_reference DROP NOT NULL;
