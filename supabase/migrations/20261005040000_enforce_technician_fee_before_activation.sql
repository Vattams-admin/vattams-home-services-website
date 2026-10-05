-- Enforce the ₹49 technician joining fee before a technician can become active.
-- Pending UTR submissions may create an application, but activation requires
-- an admin-verified successful registration payment for the same mobile.

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS registration_payment_id text;

CREATE INDEX IF NOT EXISTS idx_technicians_registration_payment
  ON technicians(registration_payment_id);

CREATE OR REPLACE FUNCTION enforce_technician_registration_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_status text;
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.registration_payment_id IS NULL OR NEW.registration_payment_id = '' THEN
      RAISE EXCEPTION 'Technician cannot be activated without a verified ₹49 registration payment';
    END IF;

    SELECT status INTO payment_status
    FROM payments
    WHERE payment_id = NEW.registration_payment_id
      AND payee_type = 'technician'
      AND payee_id = NEW.mobile
      AND amount = 49
      AND purpose = 'registration_fee'
      AND utr IS NOT NULL
    LIMIT 1;

    IF payment_status IS DISTINCT FROM 'success' THEN
      RAISE EXCEPTION 'Technician cannot be activated until the ₹49 registration payment is verified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_technician_registration_fee ON technicians;
CREATE TRIGGER trg_enforce_technician_registration_fee
BEFORE INSERT OR UPDATE ON technicians
FOR EACH ROW
EXECUTE FUNCTION enforce_technician_registration_fee();
