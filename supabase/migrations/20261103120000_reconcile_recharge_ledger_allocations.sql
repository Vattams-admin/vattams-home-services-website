-- Reconcile recharge ledger allocations with the actual wallet movements.
-- A recharge may settle commission dues and credit only its remainder to cash
-- wallet balance. Never record the full payment as recharge_credit.
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'registration_fee'::text,
    'deposit_lock'::text,
    'deposit_release'::text,
    'commission_deduction'::text,
    'platform_fee_remittance'::text,
    'gst_remittance'::text,
    'call_rate_fee'::text,
    'recharge_credit'::text,
    'recharge_dues_settlement'::text,
    'recharge_debit'::text,
    'adjustment'::text
  ]));

CREATE OR REPLACE FUNCTION public.process_recharge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  settings record;
  c_due numeric(12,2);
  due_after numeric(12,2);
  dues_settled numeric(12,2);
  wallet_credit numeric(12,2);
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    SELECT * INTO settings FROM public.wallet_settings LIMIT 1;

    SELECT commission_due INTO c_due
    FROM public.technicians
    WHERE id = NEW.technician_id
    FOR UPDATE;

    c_due := COALESCE(c_due, 0);
    dues_settled := LEAST(c_due, NEW.amount);
    due_after := GREATEST(c_due - NEW.amount, 0);
    wallet_credit := GREATEST(NEW.amount - c_due, 0);

    UPDATE public.technicians
    SET commission_due = due_after,
        wallet_balance = wallet_balance + wallet_credit
    WHERE id = NEW.technician_id;

    IF dues_settled > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_dues_settlement', dues_settled, NEW.id,
         'Recharge allocation applied to outstanding platform, tax and call-rate dues');
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
           'Your outstanding platform-fee, tax-remittance and call-rate dues are within the allowed limit. You can receive new jobs again.');
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
