-- Technician commission remittance: technician collects the customer payment,
-- then remits only the platform commission/dues to VATTAMS for admin verification.
-- This is deliberately separate from wallet_recharges (which credits wallet balance).

CREATE TABLE IF NOT EXISTS public.technician_commission_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 100000),
  payment_method text NOT NULL CHECK (payment_method IN ('upi','bank_transfer','cash')),
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','rejected')),
  technician_note text,
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  CONSTRAINT technician_commission_remittances_reference_length
    CHECK (payment_reference IS NULL OR length(payment_reference) <= 255),
  CONSTRAINT technician_commission_remittances_admin_note_length
    CHECK (admin_note IS NULL OR length(admin_note) <= 1000)
);

CREATE INDEX IF NOT EXISTS technician_commission_remittances_technician_created_idx
  ON public.technician_commission_remittances (technician_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS technician_commission_remittances_status_created_idx
  ON public.technician_commission_remittances (status, submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS technician_commission_remittances_reference_unique
  ON public.technician_commission_remittances (lower(payment_reference))
  WHERE payment_reference IS NOT NULL AND btrim(payment_reference) <> '';

ALTER TABLE public.technician_commission_remittances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_commission_remittances FROM anon, authenticated;
GRANT ALL ON public.technician_commission_remittances TO service_role;

CREATE OR REPLACE FUNCTION public.apply_technician_commission_remittance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  current_due numeric(12,2);
  lock_limit numeric(12,2);
BEGIN
  IF NEW.status = 'received' AND OLD.status IS DISTINCT FROM 'received' THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REMITTANCE_NOT_PENDING';
    END IF;

    SELECT commission_due INTO current_due
    FROM public.technicians
    WHERE id = NEW.technician_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_FOUND';
    END IF;

    current_due := GREATEST(COALESCE(current_due, 0), 0);
    IF NEW.amount > current_due THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'REMITTANCE_EXCEEDS_OUTSTANDING_DUE';
    END IF;

    SELECT COALESCE(lock_threshold, 0) INTO lock_limit
    FROM public.wallet_settings
    LIMIT 1;

    UPDATE public.technicians
    SET commission_due = GREATEST(current_due - NEW.amount, 0),
        wallet_locked = CASE
          WHEN GREATEST(current_due - NEW.amount, 0) <= COALESCE(lock_limit, 0)
          THEN false ELSE wallet_locked END
    WHERE id = NEW.technician_id;

    INSERT INTO public.wallet_transactions
      (technician_id, type, amount, description)
    VALUES
      (NEW.technician_id, 'platform_fee_remittance', NEW.amount,
       'Commission remittance received and verified by admin; reference ' ||
       COALESCE(NEW.payment_reference, 'not supplied'));

    INSERT INTO public.technician_notifications
      (technician_id, type, title, message)
    VALUES
      (NEW.technician_id, 'recharge_approved', 'Commission Payment Verified',
       'Your remittance of Rs ' || NEW.amount ||
       ' has been verified. Outstanding commission due is Rs ' ||
       GREATEST(current_due - NEW.amount, 0) || '.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REMITTANCE_ALREADY_FINAL';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_apply_technician_commission_remittance
  ON public.technician_commission_remittances;
CREATE TRIGGER trg_apply_technician_commission_remittance
  BEFORE UPDATE OF status ON public.technician_commission_remittances
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_technician_commission_remittance();

COMMENT ON TABLE public.technician_commission_remittances IS
  'Technician-submitted commission remittances; only admin verification settles commission_due. Not a wallet recharge.';
