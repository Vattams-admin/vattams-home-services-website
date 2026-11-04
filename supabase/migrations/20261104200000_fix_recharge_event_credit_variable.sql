-- Resolve PL/pgSQL name ambiguity and satisfy the approval-event
-- allocation CHECK constraint on the initial insert. The event row must be
-- claimed with a complete allocation (dues + wallet credit = recharge amount)
-- in one statement; inserting zero defaults then updating cannot pass the
-- table's immediate CHECK constraint.
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
  v_wallet_credit numeric(12,2);
  claimed_recharge_id uuid;
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
    v_wallet_credit := NEW.amount - dues_settled;

    -- Claim and persist the complete allocation atomically. The table enforces
    -- dues_applied + wallet_credit = amount at statement time.
    INSERT INTO public.wallet_recharge_approval_events
      (recharge_id, technician_id, amount, dues_applied, wallet_credit, approved_by)
    VALUES
      (NEW.id, NEW.technician_id, NEW.amount, dues_settled, v_wallet_credit, NEW.approved_by)
    ON CONFLICT (recharge_id) DO NOTHING
    RETURNING recharge_id INTO claimed_recharge_id;

    IF claimed_recharge_id IS NULL THEN
      RETURN NEW;
    END IF;

    UPDATE public.technicians
    SET commission_due = due_after,
        wallet_balance = wallet_balance + v_wallet_credit
    WHERE id = NEW.technician_id;

    IF dues_settled > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_dues_settlement', dues_settled, NEW.id,
         'Recharge allocation applied to outstanding platform and call-rate dues');
    END IF;

    IF v_wallet_credit > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_credit', v_wallet_credit, NEW.id,
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
       '. Remaining wallet credit: Rs ' || v_wallet_credit || '.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;
