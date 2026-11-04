-- Historical migration mirror for the already-applied production migration.
-- Supabase migration ledger version: 20261102154512.
CREATE TABLE IF NOT EXISTS public.wallet_recharge_approval_events (
  recharge_id uuid PRIMARY KEY REFERENCES public.wallet_recharges(id) ON DELETE RESTRICT,
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  dues_applied numeric(12,2) NOT NULL DEFAULT 0 CHECK (dues_applied >= 0),
  wallet_credit numeric(12,2) NOT NULL DEFAULT 0 CHECK (wallet_credit >= 0),
  approved_by text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  CHECK (dues_applied + wallet_credit = amount)
);

REVOKE ALL ON TABLE public.wallet_recharge_approval_events FROM PUBLIC, anon, authenticated;

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_recharge_type
ON public.wallet_transactions (recharge_id, type)
WHERE recharge_id IS NOT NULL;

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
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
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
    FROM public.technicians WHERE id = NEW.technician_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Recharge technician does not exist';
    END IF;

    c_due := GREATEST(COALESCE(c_due, 0), 0);
    due_applied := LEAST(c_due, NEW.amount);
    wallet_credit := NEW.amount - due_applied;

    UPDATE public.wallet_recharge_approval_events
    SET dues_applied = due_applied, wallet_credit = wallet_credit
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
      UPDATE public.technicians SET wallet_locked = false
      WHERE id = NEW.technician_id AND wallet_locked = true;

      IF FOUND THEN
        INSERT INTO public.technician_notifications (technician_id, type, title, message)
        VALUES (NEW.technician_id, 'account_unlocked', 'Account Unlocked',
          'Your outstanding dues are within the allowed limit. You can receive new jobs again.');
      END IF;
    END IF;

    INSERT INTO public.technician_notifications (technician_id, type, title, message)
    VALUES (NEW.technician_id, 'recharge_approved', 'Payment Approved',
      'Recharge Rs ' || NEW.amount || ': Rs ' || due_applied
      || ' applied to dues; Rs ' || wallet_credit || ' credited to wallet.');

    PERFORM public.recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$function$;
