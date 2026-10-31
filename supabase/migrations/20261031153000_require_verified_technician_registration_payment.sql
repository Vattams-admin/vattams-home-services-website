-- Require independently verified settlement before a technician can be activated.
-- Keep the existing ₹49 amount unchanged pending business/bank reconciliation of PR #36's ₹50 proposal.

CREATE OR REPLACE FUNCTION public.enforce_technician_registration_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_status text;
  payment_verified_by text;
  payment_verified_at timestamptz;
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.registration_payment_id IS NULL OR NEW.registration_payment_id = '' THEN
      RAISE EXCEPTION 'Technician cannot be activated without a verified ₹49 registration payment';
    END IF;

    SELECT status, verified_by, verified_at
      INTO payment_status, payment_verified_by, payment_verified_at
    FROM public.payments
    WHERE payment_id = NEW.registration_payment_id
      AND payee_type = 'technician'
      AND payee_id = NEW.mobile
      AND amount = 49
      AND purpose = 'registration_fee'
      AND NULLIF(btrim(utr), '') IS NOT NULL
    LIMIT 1;

    IF payment_status IS DISTINCT FROM 'success'
       OR NULLIF(btrim(payment_verified_by), '') IS NULL
       OR payment_verified_at IS NULL THEN
      RAISE EXCEPTION 'Technician cannot be activated until the ₹49 registration payment is independently verified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
