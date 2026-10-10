-- Fix double-charging: customer platform fee and GST are already part of
-- checkout total. Technician dues must contain only the fixed completion fee.
-- No existing balances are altered by this function replacement.
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
  completed_count int;
  deposit_released_already boolean;
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

    -- Customer checkout already includes the customer platform fee and
    -- tax. Do not deduct those a second time from the technician.
    -- Only the disclosed fixed call-rate success fee becomes technician dues.
    due_amount := COALESCE(NEW.call_rate_fee, 0);

    IF due_amount > 0 THEN
      UPDATE public.technicians
      SET commission_due = commission_due + due_amount
      WHERE id = tech_id;

      IF COALESCE(NEW.call_rate_fee, 0) > 0 THEN
        INSERT INTO public.wallet_transactions (technician_id, type, amount, booking_id, description)
        VALUES (tech_id, 'call_rate_fee', NEW.call_rate_fee, NEW.id,
          'Fixed call-rate fee for completed booking ' || NEW.booking_number);

        INSERT INTO public.technician_notifications (technician_id, type, title, message)
        VALUES (tech_id, 'call_rate_fee', 'Call Rate Fee Recorded',
          'Rs ' || NEW.call_rate_fee || ' fixed call-rate fee recorded for completed booking '
          || NEW.booking_number
          || '. Customer platform fee and GST are not deducted again from your wallet.');
      END IF;
    END IF;

    UPDATE public.technicians
    SET completed_jobs_count = completed_jobs_count + 1,
        total_jobs = total_jobs + 1
    WHERE id = tech_id;

    SELECT completed_jobs_count, deposit_released, wallet_balance, commission_due, locked_deposit
    INTO completed_count, deposit_released_already, w_balance, c_due, l_deposit
    FROM public.technicians WHERE id = tech_id;

    IF completed_count >= settings.deposit_release_job_threshold
       AND NOT deposit_released_already
       AND COALESCE(l_deposit, 0) > 0 THEN
      UPDATE public.technicians
      SET locked_deposit = 0, deposit_released = true
      WHERE id = tech_id;

      INSERT INTO public.wallet_transactions (technician_id, type, amount, description)
      VALUES (tech_id, 'deposit_release', settings.registration_fee,
        'Security deposit released after completing ' || completed_count || ' jobs');

      INSERT INTO public.technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'deposit_released', 'Security Deposit Released',
        'Congratulations! Your Rs ' || settings.registration_fee || ' security deposit has been released after completing ' || completed_count || ' jobs.');
    END IF;

    SELECT commission_due, wallet_balance INTO c_due, w_balance
    FROM public.technicians WHERE id = tech_id;

    IF c_due > settings.lock_threshold THEN
      UPDATE public.technicians SET wallet_locked = true
      WHERE id = tech_id AND COALESCE(wallet_locked, false) = false;

      IF FOUND THEN
        INSERT INTO public.technician_notifications (technician_id, type, title, message)
        VALUES (tech_id, 'account_locked', 'Account Paused — Settlement Due',
          'Your outstanding platform-fee, tax-remittance and call-rate dues exceed Rs ' || settings.lock_threshold || '. Please clear them to receive new jobs.');
      END IF;
    END IF;

    SELECT wallet_balance, locked_deposit, commission_due
    INTO w_balance, l_deposit, c_due
    FROM public.technicians WHERE id = tech_id;

    IF (w_balance - l_deposit - c_due) < settings.low_balance_threshold THEN
      INSERT INTO public.technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'wallet_low', 'Wallet Balance Low',
        'Your available wallet balance is below Rs ' || settings.low_balance_threshold || '. Review your wallet before accepting more jobs.');
    END IF;

    PERFORM public.recalc_available_balance(tech_id);
  END IF;

  RETURN NEW;
END;
$function$;
