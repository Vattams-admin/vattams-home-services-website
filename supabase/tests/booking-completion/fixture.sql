DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE TABLE public.technicians (
  id uuid PRIMARY KEY,
  commission_due numeric(12,2) NOT NULL DEFAULT 0,
  wallet_balance numeric(12,2) NOT NULL DEFAULT 100,
  locked_deposit numeric(12,2) NOT NULL DEFAULT 0,
  available_balance numeric(12,2) NOT NULL DEFAULT 100,
  completed_jobs_count integer NOT NULL DEFAULT 0,
  total_jobs integer,
  deposit_released boolean NOT NULL DEFAULT false,
  wallet_locked boolean NOT NULL DEFAULT false
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY,
  booking_number text NOT NULL,
  status text NOT NULL,
  assigned_technician_id uuid REFERENCES public.technicians(id),
  call_rate_fee numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.wallet_settings (
  id integer PRIMARY KEY,
  deposit_release_job_threshold integer NOT NULL,
  registration_fee numeric(12,2) NOT NULL,
  lock_threshold numeric(12,2) NOT NULL,
  low_balance_threshold numeric(12,2) NOT NULL
);

CREATE TABLE public.wallet_transactions (
  id bigserial PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  description text NOT NULL
);

CREATE TABLE public.technician_notifications (
  id bigserial PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL
);

CREATE OR REPLACE FUNCTION public.recalc_available_balance(p_technician_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.technicians
  SET available_balance = GREATEST(wallet_balance - locked_deposit - commission_due, 0)
  WHERE id = p_technician_id;
$$;
