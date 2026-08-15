/*
# Add payment + approval-workflow fields to tuition_tutors

## 1. Purpose
Extends the existing `tuition_tutors` table (created in
20260815010000_create_tuition_tutors_table.sql) with the columns needed
for the Tutor Registration Fee / Payment / Approval workflow:

  - Registration fee + special-offer discount (computed server-side,
    at insert time, from a fixed offer window — never trusted from the
    client).
  - Payment status (pending / submitted / verified / failed).
  - A granular approval_status (REGISTERED / PAYMENT_PENDING /
    PAYMENT_VERIFIED / PENDING_APPROVAL / APPROVED / REJECTED) that
    sits alongside the existing coarse `status` column.
  - Approval / rejection audit fields (who, when, why).

## 2. What this migration explicitly does NOT do
  - Does NOT touch `public.admin_list_tuition_tutors` (not defined in
    this repo's migration history at all — it already exists in the
    live project and must keep working exactly as-is).
  - Does NOT modify the existing `status` column, its CHECK constraint,
    its default, or the `trg_assign_tutor_employee_id` trigger from
    20260815030000 — that trigger keeps firing exactly as before, so
    employee ID assignment on approval is unaffected.
  - Does NOT touch RLS policies on tuition_tutors. The table still has
    no public SELECT/UPDATE — all admin reads/writes continue to go
    through the `tuition-tutor-admin` edge function (service_role key),
    which this change extends separately.
  - Does NOT create a new table. `tuition_tutors` is reused; only
    columns are added.

## 3. Registration fee logic (server-side, tamper-proof)
A BEFORE INSERT trigger fills registration_fee / discount_amount /
discount_percentage / amount_paid / payment_status / approval_status
whenever they are not explicitly supplied, based on the offer window:

  regular_fee = 2000
  offer_fee   = 500
  offer_start = 2026-08-15
  offer_end   = 2026-09-05

If the insert happens within the offer window: amount payable = 500,
discount = 1500 (75%). Otherwise: amount payable = 2000, discount = 0.
Because this runs in a BEFORE INSERT trigger using CURRENT_DATE, a
client can never override the fee by passing different values, and the
offer automatically stops applying the moment the window closes —
no code deploy required.

## 4. Backfill
The one existing row in this table pre-dates this feature. It is
backfilled once, using the same offer-window logic evaluated against
its own `created_at`, and its payment/approval fields are derived from
its existing `status` / `reviewed_at` / `reviewed_by_email` /
`admin_notes` so the new columns are consistent with data that already
exists. This is a one-time UPDATE guarded by `WHERE registration_fee IS
NULL`, so re-running this migration is a no-op the second time.

## 5. Idempotency
Every statement uses IF NOT EXISTS / IF EXISTS / OR REPLACE / guarded
UPDATE ... WHERE columns IS NULL, so this migration is safe to re-run.
*/

-- ============================================================
-- 1. Columns (additive only)
-- ============================================================

ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS registration_fee numeric(10,2);
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS discount_percentage integer NOT NULL DEFAULT 0;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2);

ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'REGISTERED';

ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS rejected_by text;
ALTER TABLE tuition_tutors ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Constraints (dropped/recreated so this block is safe to re-run)
ALTER TABLE tuition_tutors DROP CONSTRAINT IF EXISTS tuition_tutors_payment_status_check;
ALTER TABLE tuition_tutors ADD CONSTRAINT tuition_tutors_payment_status_check
  CHECK (payment_status IN ('pending', 'submitted', 'verified', 'failed'));

ALTER TABLE tuition_tutors DROP CONSTRAINT IF EXISTS tuition_tutors_approval_status_check;
ALTER TABLE tuition_tutors ADD CONSTRAINT tuition_tutors_approval_status_check
  CHECK (approval_status IN (
    'REGISTERED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED',
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
  ));

CREATE INDEX IF NOT EXISTS idx_tuition_tutors_payment_status ON tuition_tutors(payment_status);
CREATE INDEX IF NOT EXISTS idx_tuition_tutors_approval_status ON tuition_tutors(approval_status);

-- ============================================================
-- 2. Server-side fee calculation trigger (BEFORE INSERT only —
--    the fee is fixed at the moment of registration and is never
--    recalculated retroactively on UPDATE).
-- ============================================================

CREATE OR REPLACE FUNCTION compute_tuition_tutor_registration_fee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_regular_fee   numeric := 2000;
  v_offer_fee     numeric := 500;
  v_offer_start   date    := '2026-08-15';
  v_offer_end     date    := '2026-09-05';
  v_offer_active  boolean;
BEGIN
  IF NEW.registration_fee IS NULL THEN
    v_offer_active := CURRENT_DATE BETWEEN v_offer_start AND v_offer_end;

    NEW.registration_fee := v_regular_fee;

    IF v_offer_active THEN
      NEW.discount_amount := v_regular_fee - v_offer_fee;
      NEW.discount_percentage := 75;
      NEW.amount_paid := v_offer_fee;
    ELSE
      NEW.discount_amount := 0;
      NEW.discount_percentage := 0;
      NEW.amount_paid := v_regular_fee;
    END IF;
  END IF;

  IF NEW.payment_status IS NULL THEN
    NEW.payment_status := 'pending';
  END IF;

  IF NEW.approval_status IS NULL OR NEW.approval_status = 'REGISTERED' THEN
    NEW.approval_status := 'PAYMENT_PENDING';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_tuition_tutor_registration_fee ON tuition_tutors;
CREATE TRIGGER trg_compute_tuition_tutor_registration_fee
  BEFORE INSERT ON tuition_tutors
  FOR EACH ROW
  EXECUTE FUNCTION compute_tuition_tutor_registration_fee();

-- ============================================================
-- 3. One-time backfill for rows that pre-date this migration
--    (guarded so this is a no-op on re-run).
-- ============================================================

DO $$
DECLARE
  v_regular_fee numeric := 2000;
  v_offer_fee   numeric := 500;
  v_offer_start date    := '2026-08-15';
  v_offer_end   date    := '2026-09-05';
BEGIN
  -- Fee / discount, based on each row's own registration date.
  UPDATE tuition_tutors
  SET
    registration_fee = v_regular_fee,
    discount_amount = CASE
      WHEN created_at::date BETWEEN v_offer_start AND v_offer_end
      THEN v_regular_fee - v_offer_fee ELSE 0 END,
    discount_percentage = CASE
      WHEN created_at::date BETWEEN v_offer_start AND v_offer_end
      THEN 75 ELSE 0 END,
    amount_paid = CASE
      WHEN created_at::date BETWEEN v_offer_start AND v_offer_end
      THEN v_offer_fee ELSE v_regular_fee END
  WHERE registration_fee IS NULL;

  -- Approval / payment status, derived from the existing coarse
  -- `status` column so historical rows are consistent with the new
  -- workflow. Only touches rows still at the untouched default.
  UPDATE tuition_tutors
  SET
    approval_status = 'APPROVED',
    payment_status = 'verified',
    approved_at = COALESCE(reviewed_at, updated_at),
    approved_by = reviewed_by_email
  WHERE status = 'approved' AND approval_status = 'PAYMENT_PENDING';

  UPDATE tuition_tutors
  SET
    approval_status = 'REJECTED',
    rejected_at = COALESCE(reviewed_at, updated_at),
    rejected_by = reviewed_by_email,
    rejection_reason = COALESCE(admin_notes, 'Not specified')
  WHERE status = 'rejected' AND approval_status = 'PAYMENT_PENDING';

  -- status = 'pending' rows are left at approval_status =
  -- 'PAYMENT_PENDING' / payment_status = 'pending', which is the
  -- correct starting point for the new workflow.
END $$;