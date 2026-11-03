-- Enforce recharge amount bounds in PostgreSQL as well as the Edge Function.
-- NOT VALID avoids assuming historical rows are clean; new writes and updates
-- are checked immediately. Existing rows can be audited before VALIDATE.
ALTER TABLE public.wallet_recharges
  ADD CONSTRAINT wallet_recharges_amount_range_check
  CHECK (amount > 0 AND amount <= 100000) NOT VALID;

-- Reconcile a recharge exactly once, only from pending -> approved.
-- Serialize all approvals for one technician on the technician row.
CREATE OR REPLACE FUNCTION public.process_recharge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  settings record;
  c_due numeric(12,2);
  dues_settled numeric(12,2);
  due_after numeric(12,2);
  wallet_credit numeric(12,2);
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RECHARGE_NOT_PENDING';
    END IF;

    IF NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount > 100000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RECHARGE_AMOUNT';
    END IF;

    SELECT * INTO settings
    FROM public.wallet_settings
    LIMIT 1;

    IF NOT FOUND OR settings.lock_threshold IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WALLET_SETTINGS_NOT_CONFIGURED';
    END IF;

    SELECT commission_due INTO c_due
    FROM public.technicians
    WHERE id = NEW.technician_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TECHNICIAN_NOT_FOUND';
    END IF;

    c_due := GREATEST(COALESCE(c_due, 0), 0);
    dues_settled := LEAST(c_due, NEW.amount);
    due_after := GREATEST(c_due - dues_settled, 0);
    wallet_credit := NEW.amount - dues_settled;

    UPDATE public.technicians
    SET commission_due = due_after,
        wallet_balance = wallet_balance + wallet_credit
    WHERE id = NEW.technician_id;

    IF dues_settled > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_dues_settlement', dues_settled, NEW.id,
         'Recharge allocation applied to outstanding platform and call-rate dues');
    END IF;

    IF wallet_credit > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_credit', wallet_credit, NEW.id,
         'Remaining recharge amount credited to wallet balance');
    END IF;

    IF due_after <= settings.lock_threshold THEN
      UPDATE public.technicians
      SET wallet_locked = false
      WHERE id = NEW.technician_id AND wallet_locked = true;

      IF FOUND THEN
        INSERT INTO public.technician_notifications
          (technician_id, type, title, message)
        VALUES
          (NEW.technician_id, 'account_unlocked', 'Account Unlocked',
           'Your outstanding dues are within the allowed limit. You can receive new jobs again.');
      END IF;
    END IF;

    INSERT INTO public.technician_notifications
      (technician_id, type, title, message)
    VALUES
      (NEW.technician_id, 'recharge_approved', 'Payment Approved',
       'Your payment of Rs ' || NEW.amount ||
       ' was allocated to dues first. Dues settled: Rs ' || dues_settled ||
       '. Remaining wallet credit: Rs ' || wallet_credit || '.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON CONSTRAINT wallet_recharges_amount_range_check ON public.wallet_recharges IS
  'Recharge requests must be greater than zero and no more than Rs 100,000.';
