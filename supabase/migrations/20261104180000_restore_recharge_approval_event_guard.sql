-- Restore the durable one-time approval claim after the later allocation
-- reconciliation migration replaced the trigger without preserving it.
-- Keep the established recharge_dues_settlement ledger type and event table.

CREATE OR REPLACE FUNCTION public.process_recharge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  settings record;
  c_due numeric(12,2);
  due_applied numeric(12,2);
  wallet_credit numeric(12,2);
  claimed_recharge_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'INVALID_RECHARGE_AMOUNT';
    END IF;

    -- Claim the recharge before making any financial changes. The primary key
    -- makes repeated/concurrent approval transitions a no-op after first claim.
    INSERT INTO public.wallet_recharge_approval_events
      (recharge_id, technician_id, amount, approved_by)
    VALUES (NEW.id, NEW.technician_id, NEW.amount, NEW.approved_by)
    ON CONFLICT (recharge_id) DO NOTHING
    RETURNING recharge_id INTO claimed_recharge_id;

    IF claimed_recharge_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO settings FROM public.wallet_settings LIMIT 1;

    SELECT commission_due INTO c_due
    FROM public.technicians
    WHERE id = NEW.technician_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'RECHARGE_TECHNICIAN_NOT_FOUND';
    END IF;

    c_due := GREATEST(COALESCE(c_due, 0), 0);
    due_applied := LEAST(c_due, NEW.amount);
    wallet_credit := NEW.amount - due_applied;

    UPDATE public.wallet_recharge_approval_events
    SET dues_applied = due_applied,
        wallet_credit = wallet_credit
    WHERE recharge_id = NEW.id;

    UPDATE public.technicians
    SET commission_due = c_due - due_applied,
        wallet_balance = wallet_balance + wallet_credit
    WHERE id = NEW.technician_id;

    IF due_applied > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_dues_settlement', due_applied, NEW.id,
         'Approved recharge allocation applied to outstanding technician dues');
    END IF;

    IF wallet_credit > 0 THEN
      INSERT INTO public.wallet_transactions
        (technician_id, type, amount, recharge_id, description)
      VALUES
        (NEW.technician_id, 'recharge_credit', wallet_credit, NEW.id,
         'Approved recharge amount credited to technician wallet after dues settlement');
    END IF;

    IF c_due - due_applied <= settings.lock_threshold THEN
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
       'Recharge Rs ' || NEW.amount || ': Rs ' || due_applied
       || ' applied to dues; Rs ' || wallet_credit || ' credited to wallet.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;
