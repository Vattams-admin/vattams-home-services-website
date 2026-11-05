-- Enforce verified registration-fee payment before technician activation.
-- Idempotent forward migration: unique payment linkage and activation guard.
CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_registration_payment_id
  ON public.technicians(registration_payment_id)
  WHERE registration_payment_id IS NOT NULL AND btrim(registration_payment_id) <> '';

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
  IF (TG_OP = 'INSERT' AND NEW.status = 'active')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'active'
         AND (OLD.status IS DISTINCT FROM NEW.status
              OR OLD.registration_payment_id IS DISTINCT FROM NEW.registration_payment_id
              OR OLD.mobile IS DISTINCT FROM NEW.mobile)) THEN
    IF NEW.registration_payment_id IS NULL OR btrim(NEW.registration_payment_id) = '' THEN
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
      RAISE EXCEPTION 'Technician cannot be activated until the ₹49 registration payment is verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_technician_registration_fee ON public.technicians;
CREATE TRIGGER trg_enforce_technician_registration_fee
BEFORE INSERT OR UPDATE OF status, registration_payment_id, mobile ON public.technicians
FOR EACH ROW
EXECUTE FUNCTION public.enforce_technician_registration_fee();
