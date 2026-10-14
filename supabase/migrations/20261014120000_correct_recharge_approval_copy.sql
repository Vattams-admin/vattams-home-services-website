-- Keep technician recharge ledger and notifications aligned with the current
-- fixed call-rate-only dues model. This changes wording only, not settlement math.

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
  wallet_credit numeric(12,2);
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    SELECT * INTO settings FROM public.wallet_settings LIMIT 1;
    SELECT commission_due INTO c_due
    FROM public.technicians WHERE id = NEW.technician_id
    FOR UPDATE;

    c_due := COALESCE(c_due, 0);
    due_after := GREATEST(c_due - NEW.amount, 0);
    wallet_credit := GREATEST(NEW.amount - c_due, 0);

    UPDATE public.technicians
    SET commission_due = due_after,
        wallet_balance = wallet_balance + wallet_credit
    WHERE id = NEW.technician_id;

    INSERT INTO public.wallet_transactions (technician_id, type, amount, recharge_id, description)
    VALUES (NEW.technician_id, 'recharge_credit', NEW.amount, NEW.id,
      'Approved payment applied to outstanding call-rate dues first; remaining wallet credit Rs ' || wallet_credit);

    IF due_after <= settings.lock_threshold THEN
      UPDATE public.technicians SET wallet_locked = false
      WHERE id = NEW.technician_id AND wallet_locked = true;

      IF FOUND THEN
        INSERT INTO public.technician_notifications (technician_id, type, title, message)
        VALUES (NEW.technician_id, 'account_unlocked', 'Account Unlocked',
          'Your outstanding call-rate dues are within the allowed limit. You can receive new jobs again.');
      END IF;
    END IF;

    INSERT INTO public.technician_notifications (technician_id, type, title, message)
    VALUES (NEW.technician_id, 'recharge_approved', 'Payment Approved',
      'Your payment of Rs ' || NEW.amount || ' has been applied to outstanding call-rate dues first. Remaining wallet credit: Rs ' || wallet_credit || '.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;
