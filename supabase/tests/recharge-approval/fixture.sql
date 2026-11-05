DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY,
  commission_due numeric(12,2) NOT NULL DEFAULT 0,
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  locked_deposit numeric(12,2) NOT NULL DEFAULT 0,
  available_balance numeric(12,2) NOT NULL DEFAULT 0,
  wallet_locked boolean NOT NULL DEFAULT false
);
CREATE TABLE public.wallet_settings (
  id integer PRIMARY KEY,
  lock_threshold numeric(12,2)
);
CREATE TABLE public.wallet_recharges (
  id uuid PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by text
);
CREATE TABLE public.wallet_transactions (
  id bigserial PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  recharge_id uuid,
  description text
);
CREATE TABLE public.technician_notifications (
  id bigserial PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL
);
CREATE OR REPLACE FUNCTION public.recalc_available_balance(p_technician_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.technicians
  SET available_balance = GREATEST(wallet_balance - locked_deposit - commission_due, 0)
  WHERE id = p_technician_id;
$$;
