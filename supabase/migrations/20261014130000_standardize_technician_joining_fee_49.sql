-- Canonical technician onboarding policy: one verified ₹49 joining fee.
-- There is no separate ₹50 security deposit under the current model.
-- Preserve historical ledger rows; they require payment-proof reconciliation and
-- must not be silently deleted or converted into real-payment evidence.

UPDATE public.wallet_settings
SET registration_fee = 49,
    updated_at = now();

-- Stop the completion trigger from releasing a legacy synthetic deposit.
-- Completed jobs continue to accrue only the snapshotted fixed call-rate fee.
CREATE OR REPLACE FUNCTION public.process_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  tech_id uuid;
  settings record;
  due_amount numeric(12,2);
  w_balance numeric(12,2);
  c_due numeric(12,2);
  l_deposit numeric(12,2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    tech_id := NEW.assigned_technician_id;
    IF tech_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO settings FROM public.wallet_settings LIMIT 1;

    -- Only the fixed call-rate success fee is a technician due.
    due_amount := COALESCE(NEW.call_rate_fee, 0);

    IF due_amount > 0 THEN
      UPDATE public.technicians
      SET commission_due = commission_due + due_amount
      WHERE id = tech_id;

      INSERT INTO public.wallet_transactions (technician_id, type, amount, booking_id, description)
      VALUES (tech_id, 'call_rate_fee', due_amount, NEW.id,
        'Fixed call-rate fee for completed booking ' || NEW.booking_number);

      INSERT INTO public.technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'call_rate_fee', 'Call Rate Fee Recorded',
        'Rs ' || due_amount || ' fixed call-rate fee is due for completed booking '
        || NEW.booking_number || '. No call-rate fee applies to incomplete or cancelled jobs.');
    END IF;

    UPDATE public.technicians
    SET completed_jobs_count = completed_jobs_count + 1,
        total_jobs = total_jobs + 1
    WHERE id = tech_id;

    SELECT commission_due, wallet_balance
    INTO c_due, w_balance
    FROM public.technicians WHERE id = tech_id;

    IF c_due > settings.lock_threshold THEN
      UPDATE public.technicians SET wallet_locked = true
      WHERE id = tech_id AND COALESCE(wallet_locked, false) = false;

      IF FOUND THEN
        INSERT INTO public.technician_notifications (technician_id, type, title, message)
        VALUES (tech_id, 'account_locked', 'Account Paused — Settlement Due',
          'Your outstanding fixed call-rate dues exceed Rs ' || settings.lock_threshold
          || '. Please clear them to receive new jobs.');
      END IF;
    END IF;

    SELECT wallet_balance, locked_deposit, commission_due
    INTO w_balance, l_deposit, c_due
    FROM public.technicians WHERE id = tech_id;

    IF (w_balance - l_deposit - c_due) < settings.low_balance_threshold THEN
      INSERT INTO public.technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'wallet_low', 'Wallet Balance Low',
        'Your available wallet balance is below Rs ' || settings.low_balance_threshold
        || '. Review your wallet before accepting more jobs.');
    END IF;

    PERFORM public.recalc_available_balance(tech_id);
  END IF;

  RETURN NEW;
END;
$function$;
