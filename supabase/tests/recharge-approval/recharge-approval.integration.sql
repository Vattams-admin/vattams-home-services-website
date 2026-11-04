CREATE TRIGGER trg_process_recharge_approval
AFTER UPDATE ON public.wallet_recharges
FOR EACH ROW EXECUTE FUNCTION public.process_recharge_approval();

DO $$
DECLARE
  v_event public.wallet_recharge_approval_events%ROWTYPE;
  v_balance numeric(12,2);
  v_due numeric(12,2);
  v_count integer;
BEGIN
  INSERT INTO public.wallet_settings(id, lock_threshold) VALUES (1, 0);
  INSERT INTO public.technicians(id, commission_due, wallet_balance)
  VALUES ('00000000-0000-0000-0000-000000000001', 40, 100);
  INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
  VALUES ('10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', 100, 'pending', 'admin');
  UPDATE public.wallet_recharges SET status='approved'
  WHERE id='10000000-0000-0000-0000-000000000001';

  SELECT * INTO v_event FROM public.wallet_recharge_approval_events
  WHERE recharge_id='10000000-0000-0000-0000-000000000001';
  IF v_event.dues_applied <> 40 OR v_event.wallet_credit <> 60 THEN
    RAISE EXCEPTION 'mixed allocation incorrect: dues %, credit %', v_event.dues_applied, v_event.wallet_credit;
  END IF;
  SELECT wallet_balance, commission_due INTO v_balance, v_due FROM public.technicians
  WHERE id='00000000-0000-0000-0000-000000000001';
  IF v_balance <> 160 OR v_due <> 0 THEN RAISE EXCEPTION 'mixed allocation balances incorrect'; END IF;

  -- Simulate a stale status reset followed by another approval attempt.
  SELECT count(*) INTO v_count FROM public.wallet_transactions
  WHERE recharge_id='10000000-0000-0000-0000-000000000001';
  UPDATE public.wallet_recharges SET status='pending'
  WHERE id='10000000-0000-0000-0000-000000000001';
  UPDATE public.wallet_recharges SET status='approved'
  WHERE id='10000000-0000-0000-0000-000000000001';
  IF (SELECT wallet_balance FROM public.technicians
      WHERE id='00000000-0000-0000-0000-000000000001') <> 160 THEN
    RAISE EXCEPTION 'duplicate approval credited wallet again';
  END IF;
  IF (SELECT count(*) FROM public.wallet_transactions
      WHERE recharge_id='10000000-0000-0000-0000-000000000001') <> v_count THEN
    RAISE EXCEPTION 'duplicate approval wrote extra ledger entries';
  END IF;

  -- Dues-only allocation: no wallet credit ledger entry.
  INSERT INTO public.technicians(id, commission_due, wallet_balance)
  VALUES ('00000000-0000-0000-0000-000000000002', 150, 25);
  INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
  VALUES ('10000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000002', 100, 'pending', 'admin');
  UPDATE public.wallet_recharges SET status='approved'
  WHERE id='10000000-0000-0000-0000-000000000002';
  SELECT * INTO v_event FROM public.wallet_recharge_approval_events
  WHERE recharge_id='10000000-0000-0000-0000-000000000002';
  IF v_event.dues_applied <> 100 OR v_event.wallet_credit <> 0 THEN
    RAISE EXCEPTION 'dues-only allocation incorrect';
  END IF;
  IF (SELECT wallet_balance FROM public.technicians
      WHERE id='00000000-0000-0000-0000-000000000002') <> 25 THEN
    RAISE EXCEPTION 'dues-only allocation changed wallet balance';
  END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions
             WHERE recharge_id='10000000-0000-0000-0000-000000000002'
               AND type='recharge_credit') THEN
    RAISE EXCEPTION 'dues-only allocation wrote wallet credit';
  END IF;

  -- Zero-dues allocation credits the full amount.
  INSERT INTO public.technicians(id, commission_due, wallet_balance)
  VALUES ('00000000-0000-0000-0000-000000000003', 0, 10);
  INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
  VALUES ('10000000-0000-0000-0000-000000000003',
          '00000000-0000-0000-0000-000000000003', 75, 'pending', 'admin');
  UPDATE public.wallet_recharges SET status='approved'
  WHERE id='10000000-0000-0000-0000-000000000003';
  SELECT * INTO v_event FROM public.wallet_recharge_approval_events
  WHERE recharge_id='10000000-0000-0000-0000-000000000003';
  IF v_event.dues_applied <> 0 OR v_event.wallet_credit <> 75 THEN
    RAISE EXCEPTION 'full wallet-credit allocation incorrect';
  END IF;

  -- Missing settings must fail closed and leave the recharge pending.
  DELETE FROM public.wallet_settings;
  INSERT INTO public.technicians(id, commission_due, wallet_balance)
  VALUES ('00000000-0000-0000-0000-000000000004', 5, 10);
  INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
  VALUES ('10000000-0000-0000-0000-000000000004',
          '00000000-0000-0000-0000-000000000004', 10, 'pending', 'admin');
  BEGIN
    UPDATE public.wallet_recharges SET status='approved'
    WHERE id='10000000-0000-0000-0000-000000000004';
    RAISE EXCEPTION 'expected missing settings to reject approval';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'WALLET_SETTINGS_NOT_CONFIGURED' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.wallet_recharges
      WHERE id='10000000-0000-0000-0000-000000000004') <> 'pending' THEN
    RAISE EXCEPTION 'failed approval did not roll back status';
  END IF;

  -- Only pending rows may transition to approved.
  INSERT INTO public.wallet_settings(id, lock_threshold) VALUES (1, 0);
  INSERT INTO public.technicians(id, commission_due, wallet_balance)
  VALUES ('00000000-0000-0000-0000-000000000005', 0, 0);
  INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
  VALUES ('10000000-0000-0000-0000-000000000005',
          '00000000-0000-0000-0000-000000000005', 20, 'rejected', 'admin');
  BEGIN
    UPDATE public.wallet_recharges SET status='approved'
    WHERE id='10000000-0000-0000-0000-000000000005';
    RAISE EXCEPTION 'expected non-pending approval to reject';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'RECHARGE_NOT_PENDING' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.wallet_recharges
      WHERE id='10000000-0000-0000-0000-000000000005') <> 'rejected' THEN
    RAISE EXCEPTION 'non-pending approval did not roll back';
  END IF;

  RAISE NOTICE 'PASS: mixed, dues-only, full-credit, retry-idempotency, missing-settings rollback and pending-only approval';
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
    VALUES ('10000000-0000-0000-0000-000000000099',
            '00000000-0000-0000-0000-000000000001', 100001, 'pending', 'admin');
    RAISE EXCEPTION 'expected amount ceiling constraint to reject over-limit recharge';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  RAISE NOTICE 'PASS: over-limit recharge rejected by database constraint';
END $$;
