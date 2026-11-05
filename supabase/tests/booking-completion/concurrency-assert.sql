DO $$
DECLARE
  v_events integer;
  v_ledger integer;
  v_due numeric(12,2);
  v_completed integer;
  v_total integer;
BEGIN
  SELECT count(*) INTO v_events FROM public.booking_completion_events
  WHERE booking_id = '30000000-0000-0000-0000-000000000003';
  SELECT count(*) INTO v_ledger FROM public.wallet_transactions
  WHERE booking_id = '30000000-0000-0000-0000-000000000003' AND type = 'call_rate_fee';
  SELECT commission_due, completed_jobs_count, total_jobs
  INTO v_due, v_completed, v_total FROM public.technicians
  WHERE id = '20000000-0000-0000-0000-000000000003';

  IF v_events <> 1 OR v_ledger <> 1 OR v_due <> 39 OR v_completed <> 1 OR v_total <> 1 THEN
    RAISE EXCEPTION 'concurrent completion invariant failed: events %, ledger %, due %, completed %, total %',
      v_events, v_ledger, v_due, v_completed, v_total;
  END IF;
END $$;
