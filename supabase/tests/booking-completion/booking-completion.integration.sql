INSERT INTO public.wallet_settings
  (id, deposit_release_job_threshold, registration_fee, lock_threshold, low_balance_threshold)
VALUES (1, 9999, 49, 500, -100000);

INSERT INTO public.technicians (id, commission_due, wallet_balance, locked_deposit, available_balance, completed_jobs_count, total_jobs)
VALUES
  ('20000000-0000-0000-0000-000000000001', 0, 100, 0, 100, 0, NULL),
  ('20000000-0000-0000-0000-000000000002', 0, 100, 0, 100, 0, 0),
  ('20000000-0000-0000-0000-000000000003', 0, 100, 0, 100, 0, 0);

INSERT INTO public.bookings (id, booking_number, status, assigned_technician_id, call_rate_fee)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'BC-REPLAY-1', 'pending', '20000000-0000-0000-0000-000000000001', 39),
  ('30000000-0000-0000-0000-000000000002', 'BC-ROLLBACK-1', 'pending', '20000000-0000-0000-0000-000000000002', 49),
  ('30000000-0000-0000-0000-000000000003', 'BC-CONCURRENT-1', 'pending', '20000000-0000-0000-0000-000000000003', 39);

CREATE TRIGGER trg_test_process_booking_completion
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.process_booking_completion();

-- First completion posts exactly one event, one call-rate ledger row and one counter increment.
UPDATE public.bookings
SET status = 'completed'
WHERE id = '30000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_events integer;
  v_ledger integer;
  v_due numeric(12,2);
  v_completed integer;
  v_total integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.booking_completion_events
  WHERE booking_id = '30000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO v_ledger FROM public.wallet_transactions
  WHERE booking_id = '30000000-0000-0000-0000-000000000001' AND type = 'call_rate_fee';
  SELECT commission_due, completed_jobs_count, total_jobs
  INTO v_due, v_completed, v_total FROM public.technicians
  WHERE id = '20000000-0000-0000-0000-000000000001';

  IF v_events <> 1 OR v_ledger <> 1 OR v_due <> 39 OR v_completed <> 1 OR v_total <> 1 THEN
    RAISE EXCEPTION 'first completion invariant failed: events %, ledger %, due %, completed %, total %',
      v_events, v_ledger, v_due, v_completed, v_total;
  END IF;
END $$;

-- Reopen and complete again: the durable booking key must prevent duplicate financial/counter effects.
UPDATE public.bookings SET status = 'pending'
WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE public.bookings SET status = 'completed'
WHERE id = '30000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_events integer;
  v_ledger integer;
  v_due numeric(12,2);
  v_completed integer;
  v_total integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.booking_completion_events
  WHERE booking_id = '30000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO v_ledger FROM public.wallet_transactions
  WHERE booking_id = '30000000-0000-0000-0000-000000000001' AND type = 'call_rate_fee';
  SELECT commission_due, completed_jobs_count, total_jobs
  INTO v_due, v_completed, v_total FROM public.technicians
  WHERE id = '20000000-0000-0000-0000-000000000001';

  IF v_events <> 1 OR v_ledger <> 1 OR v_due <> 39 OR v_completed <> 1 OR v_total <> 1 THEN
    RAISE EXCEPTION 'recompletion idempotency failed: events %, ledger %, due %, completed %, total %',
      v_events, v_ledger, v_due, v_completed, v_total;
  END IF;
END $$;

-- Force a downstream ledger failure. PostgreSQL must roll back the booking update and event claim.
CREATE OR REPLACE FUNCTION public.test_reject_booking_ledger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_id = '30000000-0000-0000-0000-000000000002' THEN
    RAISE EXCEPTION 'injected booking ledger failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_test_reject_booking_ledger
BEFORE INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.test_reject_booking_ledger();

DO $$
BEGIN
  BEGIN
    UPDATE public.bookings SET status = 'completed'
    WHERE id = '30000000-0000-0000-0000-000000000002';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'injected booking ledger failure' THEN
      RAISE;
    END IF;
  END;
END $$;

DROP TRIGGER trg_test_reject_booking_ledger ON public.wallet_transactions;
DROP FUNCTION public.test_reject_booking_ledger();

DO $$
DECLARE
  v_events integer;
  v_status text;
  v_completed integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.booking_completion_events
  WHERE booking_id = '30000000-0000-0000-0000-000000000002';
  SELECT status INTO v_status FROM public.bookings
  WHERE id = '30000000-0000-0000-0000-000000000002';
  SELECT completed_jobs_count INTO v_completed FROM public.technicians
  WHERE id = '20000000-0000-0000-0000-000000000002';

  IF v_events <> 0 OR v_status <> 'pending' OR v_completed <> 0 THEN
    RAISE EXCEPTION 'failed completion was not rolled back: events %, status %, completed %',
      v_events, v_status, v_completed;
  END IF;
END $$;

-- A retry after rollback must succeed once, proving the failed transaction left no durable claim.
UPDATE public.bookings SET status = 'completed'
WHERE id = '30000000-0000-0000-0000-000000000002';

DO $$
DECLARE
  v_events integer;
  v_ledger integer;
  v_due numeric(12,2);
  v_completed integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.booking_completion_events
  WHERE booking_id = '30000000-0000-0000-0000-000000000002';
  SELECT count(*) INTO v_ledger FROM public.wallet_transactions
  WHERE booking_id = '30000000-0000-0000-0000-000000000002' AND type = 'call_rate_fee';
  SELECT commission_due, completed_jobs_count INTO v_due, v_completed
  FROM public.technicians WHERE id = '20000000-0000-0000-0000-000000000002';

  IF v_events <> 1 OR v_ledger <> 1 OR v_due <> 49 OR v_completed <> 1 THEN
    RAISE EXCEPTION 'retry after rollback failed: events %, ledger %, due %, completed %',
      v_events, v_ledger, v_due, v_completed;
  END IF;
END $$;

-- Third booking is reserved for the separate two-session concurrency race in the workflow.
