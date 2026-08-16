/*
# Create tuition_trial_requests table + RPCs — Vattams Online Tuition
  (Trial Class Booking)

1. Purpose
   - Backs the new Trial Booking flow: Online Tuition -> Course -> Level
     -> Book Now -> Trial Booking, for exactly two courses at launch:
     Abacus (slug: abacus) and Public Speaking (slug: spoken-english —
     the internal slug intentionally stays the same as the existing
     "Spoken English" course already in tuitionCoursesData.ts; this table
     does not rename, alter, or touch that course record in any way).
   - Confirmed by searching the whole project: no `tuition_trial_requests`
     table exists anywhere in prior migrations, so this is a new table,
     not a recreation.
   - Completely separate from every other table in this project
     (bookings, technicians, customers, payments, admins, tuition_students,
     tuition_tutors, tuition_courses, tuition_course_materials, etc). No
     existing table, column, trigger, policy, or row is modified by this
     migration. In particular, the shared `payments` table (used by Home
     Services / Technician flows) is not touched — the trial payment flow
     below is self-contained to this new table only.

2. Trial fee integrity (server-side, not just UI)
   - fee_amount is a fixed numeric column DEFAULTing to 150, with a CHECK
     constraint forcing it to always equal 150. Combined with the INSERT
     policy's WITH CHECK below, this makes it impossible for any client
     (even one bypassing the UI and calling the anon-key insert directly)
     to record a different fee — Postgres rejects the row outright.
   - session_count is likewise fixed at 1 via DEFAULT + CHECK.

3. Status model (exactly as specified)
   - payment_status: PAYMENT_PENDING | PAYMENT_PROCESSING | PAYMENT_VERIFIED
     | PAYMENT_FAILED (default PAYMENT_PENDING).
   - booking_status: PAYMENT_PENDING | CONFIRMED | CANCELLED (default
     PAYMENT_PENDING). Only ever moves to CONFIRMED once payment_status
     is set to PAYMENT_VERIFIED by an admin (see RPC below) — there is no
     path in this migration that lets a client set booking_status to
     CONFIRMED directly.

4. Security (RLS)
   - Enable RLS.
   - INSERT: public (anon + authenticated) may create their own trial
     request — but the WITH CHECK clause pins fee_amount = 150,
     session_count = 1, payment_status = 'PAYMENT_PENDING',
     booking_status = 'PAYMENT_PENDING', and course_slug to one of the two
     launch courses, so a tampered payload is rejected at the database
     level, not just hidden by the UI.
   - No public SELECT / UPDATE / DELETE policies. All reads and every
     status transition after the initial insert go exclusively through
     the SECURITY DEFINER RPC functions below.

5. New RPC functions
   - submit_trial_payment_utr(p_trial_id uuid, p_utr text)
     Public-callable (no admin needed — this is the student's own "I've
     paid" self-report step, the same UPI+UTR pattern already used by
     src/components/PaymentModal.tsx / src/lib/payments.ts elsewhere in
     this project). Only succeeds while payment_status is still
     PAYMENT_PENDING (blocks replay/tampering once a payment is already
     being processed, verified, or failed) and requires a non-empty UTR.
     Moves payment_status to PAYMENT_PROCESSING. Does NOT mark the
     booking CONFIRMED — that always requires an admin decision.
   - admin_list_tuition_trial_requests(p_admin_id uuid)
     Returns all trial requests, newest first, after verifying p_admin_id
     against the existing `admins` table (same pattern as
     admin_list_tuition_students).
   - admin_update_tuition_trial_status(p_admin_id uuid, p_trial_id uuid,
     p_payment_status text, p_booking_status text)
     Lets an admin set both fields after reviewing the submitted UTR
     (values re-validated against the same allowed sets as the table's
     CHECK constraints, so an invalid value is rejected with a clear
     error rather than silently stored).

6. Scope / Non-goals
   - Does not touch tuition_students, tuition_tutors, tuition_courses,
     tuition_course_materials, payments, admins, admin_sessions, or any
     Home Services / Technician table.
   - No seed data: real trial requests only.

7. Idempotency
   - Every statement below is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS tuition_trial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_name text NOT NULL,
  parent_name text NOT NULL,
  mobile text NOT NULL,
  email text NOT NULL,

  course_name text NOT NULL,
  course_slug text NOT NULL CHECK (course_slug IN ('abacus', 'spoken-english')),
  level text NOT NULL CHECK (level IN ('Foundation', 'Beginner', 'Intermediate', 'Advanced')),

  preferred_date date,
  preferred_time text,
  notes text,

  fee_amount numeric(12,2) NOT NULL DEFAULT 150 CHECK (fee_amount = 150),
  session_count integer NOT NULL DEFAULT 1 CHECK (session_count = 1),

  payment_status text NOT NULL DEFAULT 'PAYMENT_PENDING'
    CHECK (payment_status IN ('PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED')),
  booking_status text NOT NULL DEFAULT 'PAYMENT_PENDING'
    CHECK (booking_status IN ('PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED')),
  utr text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for the admin list/filter view (status tabs + recency ordering)
CREATE INDEX IF NOT EXISTS idx_tuition_trial_requests_payment_status ON tuition_trial_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_tuition_trial_requests_booking_status ON tuition_trial_requests(booking_status);
CREATE INDEX IF NOT EXISTS idx_tuition_trial_requests_created_at ON tuition_trial_requests(created_at DESC);

-- Row Level Security
ALTER TABLE tuition_trial_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_tuition_trial_requests" ON tuition_trial_requests;
CREATE POLICY "public_insert_tuition_trial_requests" ON tuition_trial_requests FOR INSERT
  TO anon, authenticated WITH CHECK (
    fee_amount = 150
    AND session_count = 1
    AND payment_status = 'PAYMENT_PENDING'
    AND booking_status = 'PAYMENT_PENDING'
    AND course_slug IN ('abacus', 'spoken-english')
  );

-- No SELECT / UPDATE / DELETE policies are created here. With RLS enabled
-- and no such policies, all reads/updates/deletes via the anon/authenticated
-- client keys are denied by default. All access beyond the initial insert
-- goes exclusively through the SECURITY DEFINER RPC functions below.

-- Auto-update updated_at on row change (trial-specific trigger function;
-- does not reuse or modify any existing trigger function in this project)
CREATE OR REPLACE FUNCTION update_tuition_trial_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuition_trial_requests_updated_at ON tuition_trial_requests;
CREATE TRIGGER tuition_trial_requests_updated_at
  BEFORE UPDATE ON tuition_trial_requests
  FOR EACH ROW EXECUTE FUNCTION update_tuition_trial_requests_updated_at();

-- Public (self-report): student confirms they have paid, by submitting the
-- UPI transaction reference (UTR). Does not verify the payment — it only
-- moves the request into PAYMENT_PROCESSING for admin review, exactly like
-- the existing UPI+UTR pattern in src/components/PaymentModal.tsx.
CREATE OR REPLACE FUNCTION submit_trial_payment_utr(
  p_trial_id uuid,
  p_utr text
)
RETURNS SETOF public.tuition_trial_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_trial_id IS NULL OR p_utr IS NULL OR length(trim(p_utr)) = 0 THEN
    RAISE EXCEPTION 'A valid transaction reference (UTR) is required';
  END IF;

  RETURN QUERY
    UPDATE public.tuition_trial_requests
    SET utr = trim(p_utr),
        payment_status = 'PAYMENT_PROCESSING'
    WHERE id = p_trial_id
      AND payment_status = 'PAYMENT_PENDING'
    RETURNING *;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This trial request cannot accept a payment confirmation right now';
  END IF;
END;
$$;

-- Admin: list trial requests
CREATE OR REPLACE FUNCTION admin_list_tuition_trial_requests(
  p_admin_id uuid
)
RETURNS SETOF public.tuition_trial_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.tuition_trial_requests
    ORDER BY created_at DESC;
END;
$$;

-- Admin: verify payment / set booking status (approve, fail, or cancel)
CREATE OR REPLACE FUNCTION admin_update_tuition_trial_status(
  p_admin_id uuid,
  p_trial_id uuid,
  p_payment_status text,
  p_booking_status text
)
RETURNS SETOF public.tuition_trial_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_payment_status NOT IN ('PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;

  IF p_booking_status NOT IN ('PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid booking status';
  END IF;

  IF p_booking_status = 'CONFIRMED' AND p_payment_status <> 'PAYMENT_VERIFIED' THEN
    RAISE EXCEPTION 'Booking can only be confirmed once payment is verified';
  END IF;

  RETURN QUERY
    UPDATE public.tuition_trial_requests
    SET payment_status = p_payment_status,
        booking_status = p_booking_status
    WHERE id = p_trial_id
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_trial_payment_utr(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_list_tuition_trial_requests(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_tuition_trial_status(uuid, uuid, text, text) TO anon, authenticated;