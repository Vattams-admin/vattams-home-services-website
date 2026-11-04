-- Keep recharge settlement and actual wallet credit distinct in the ledger.
-- A recharge is processed at most once, even if its status is toggled away from
-- approved and later retried. All effects remain in the approval transaction.

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
    'dues_settlement'::text,
    'recharge_credit'::text,
    'recharge_debit'::text,
    'adjustment'::text
  ]));

-- Fail safely rather than silently choosing a winner if historic rows already
-- contain duplicate postings for the same recharge and ledger event type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE recharge_id IS NOT NULL
      AND type IN ('dues_settlement', 'recharge_credit')
    GROUP BY recharge_id, type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_RECHARGE_LEDGER_ROWS_REQUIRE_RECONCILIATION';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_recharge_event
  ON public.wallet_transactions (recharge_id, type)
  WHERE recharge_id IS NOT NULL
    AND type IN ('dues_settlement', 'recharge_credit');

CREATE OR REPLACE FUNCTION public.process_recharge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  settings record;
  current_due numeric(12,2);
  current_balance numeric(12,2);
  due_settlement numeric(12,2);
  wallet_credit numeric(12,2);
  resulting_balance numeric(12,2);
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'INVALID_RECHARGE_AMOUNT';
    END IF;

    SELECT * INTO settings
    FROM public.wallet_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    SELECT commission_due, wallet_balance
      INTO current_due, current_balance
    FROM public.technicians
    WHERE id = NEW.technician_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'RECHARGE_TECHNICIAN_NOT_FOUND';
    END IF;

    current_due := GREATEST(COALESCE(current_due, 0), 0);
    current_balance := COALESCE(current_balance, 0);
    due_settlement := LEAST(current_due, NEW.amount);
    wallet_credit := GREATEST(NEW.amount - due_settlement, 0);
    resulting_balance := current_balance + wallet_credit;

    UPDATE public.technicians
    SET commission_due = current_due - due_settlement,
        wallet_balance = resulting_balance
    WHERE id = NEW.technician_id;

    IF due_settlement > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, balance_after, recharge_id, description)
      VALUES
        (NEW.technician_id, 'dues_settlement', due_settlement, resulting_balance, NEW.id,
         'Recharge payment applied to outstanding platform, tax and call-rate dues');
    END IF;

    IF wallet_credit > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, balance_after, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_credit', wallet_credit, resulting_balance, NEW.id,
         'Net wallet credit after settling outstanding dues from recharge payment');
    END IF;

    IF COALESCE(settings.lock_threshold, 0) >= current_due - due_settlement THEN
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
       'Payment Rs ' || NEW.amount || ' approved. Dues settled: Rs ' || due_settlement
       || '. Wallet credited: Rs ' || wallet_credit || '.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;
