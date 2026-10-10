-- Win-win fixed call-rate model for VATTAMS HOME SERVICES.
-- A technician owes one fixed fee only after a booking is completed.
-- No simultaneous customer platform fee or percentage commission.
-- Historical bookings keep a zero call-rate snapshot to avoid retroactive charges.

ALTER TABLE public.service_prices
  ADD COLUMN IF NOT EXISTS call_rate_fee numeric(10,2) NOT NULL DEFAULT 25
  CHECK (call_rate_fee >= 0);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS call_rate_fee numeric(10,2) NOT NULL DEFAULT 0
  CHECK (call_rate_fee >= 0);

ALTER TABLE public.technician_jobs
  ADD COLUMN IF NOT EXISTS call_rate_fee numeric(10,2) NOT NULL DEFAULT 0
  CHECK (call_rate_fee >= 0);

-- Launch recommendation: modest fixed fees, adjusted by appliance category.
-- Remove the old stacked platform fee + percentage commission for the active
-- appliance catalog. Inactive legacy categories are left inactive.
UPDATE public.service_prices
SET
  call_rate_fee = CASE
    WHEN service_name IN ('AC Repair', 'AC Service') THEN 35
    ELSE 25
  END,
  platform_fee = 0,
  commission_rate = 0,
  updated_at = now()
WHERE is_active = true
  AND service_name IN (
    'AC Repair', 'AC Service',
    'Washing Machine', 'Washing Machine Repair',
    'Refrigerator', 'Refrigerator Repair'
  );

ALTER TABLE public.service_prices
  ALTER COLUMN call_rate_fee SET DEFAULT 25;

-- Avoid locking a technician after a single small call-rate fee.
UPDATE public.wallet_settings
SET lock_threshold = 500, updated_at = now();

-- Permit the ledger to identify fixed call-rate fees separately from the old
-- percentage commission type. Keep every historical type available.
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'registration_fee'::text,
    'deposit_lock'::text,
    'deposit_release'::text,
    'commission_deduction'::text,
    'call_rate_fee'::text,
    'recharge_credit'::text,
    'recharge_debit'::text,
    'adjustment'::text
  ]));

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

    -- The call rate is a fixed success fee. It is only due after completion;
    -- rejected, cancelled, or uncompleted bookings are not charged.
    due_amount := COALESCE(NEW.call_rate_fee, 0);

    IF due_amount > 0 THEN
      UPDATE public.technicians
      SET
        wallet_balance = wallet_balance - due_amount,
        commission_due = commission_due + due_amount
      WHERE id = tech_id;

      INSERT INTO public.wallet_transactions (technician_id, type, amount, booking_id, description)
      VALUES (tech_id, 'call_rate_fee', due_amount, NEW.id,
        'Fixed call-rate fee for completed booking ' || NEW.booking_number);

      INSERT INTO public.technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'call_rate_fee', 'Call Rate Fee Recorded',
        'Rs ' || due_amount || ' call-rate fee recorded for completed booking ' || NEW.booking_number || '. No call-rate fee applies to incomplete or cancelled jobs.');
    END IF;

    UPDATE public.technicians
    SET completed_jobs_count = completed_jobs_count + 1,
        total_jobs = total_jobs + 1
    WHERE id = tech_id;

    SELECT completed_jobs_count, deposit_released, wallet_balance, commission_due, locked_deposit
    INTO completed_count, deposit_released_already, w_balance, c_due, l_deposit
    FROM public.technicians WHERE id = tech_id;

    IF completed_count >= settings.deposit_release_job_threshold AND NOT deposit_released_already THEN
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
        VALUES (tech_id, 'account_locked', 'Account Paused — Call Rate Dues',
          'Your outstanding call-rate fees exceed Rs ' || settings.lock_threshold || '. Please clear the outstanding balance to receive new jobs.');
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
