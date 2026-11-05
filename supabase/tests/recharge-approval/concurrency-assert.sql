DO $$
DECLARE
  v_events integer;
  v_credits integer;
  v_balance numeric(12,2);
BEGIN
  SELECT count(*) INTO v_events FROM public.wallet_recharge_approval_events
  WHERE recharge_id='10000000-0000-0000-0000-000000000006';
  SELECT count(*) INTO v_credits FROM public.wallet_transactions
  WHERE recharge_id='10000000-0000-0000-0000-000000000006'
    AND type='recharge_credit';
  SELECT wallet_balance INTO v_balance FROM public.technicians
  WHERE id='00000000-0000-0000-0000-000000000006';
  IF v_events <> 1 THEN RAISE EXCEPTION 'concurrent approval created % events', v_events; END IF;
  IF v_credits <> 1 THEN RAISE EXCEPTION 'concurrent approval created % credit ledger rows', v_credits; END IF;
  IF v_balance <> 85 THEN RAISE EXCEPTION 'concurrent approval wallet balance is %, expected 85', v_balance; END IF;
  RAISE NOTICE 'PASS: two concurrent sessions produced one event, one credit and one wallet increment';
END $$;


DO $$
DECLARE
  v_events integer;
  v_dues numeric(12,2);
  v_credit numeric(12,2);
  v_balance numeric(12,2);
  v_due numeric(12,2);
BEGIN
  SELECT count(*), COALESCE(sum(dues_applied),0), COALESCE(sum(wallet_credit),0)
  INTO v_events, v_dues, v_credit
  FROM public.wallet_recharge_approval_events
  WHERE recharge_id IN ('10000000-0000-0000-0000-000000000007',
                        '10000000-0000-0000-0000-000000000008');
  SELECT wallet_balance, commission_due INTO v_balance, v_due
  FROM public.technicians WHERE id='00000000-0000-0000-0000-000000000007';
  IF v_events <> 2 THEN RAISE EXCEPTION 'same-technician concurrent approvals created % events', v_events; END IF;
  IF v_dues <> 100 OR v_credit <> 60 THEN
    RAISE EXCEPTION 'same-technician allocation incorrect: dues %, credit %', v_dues, v_credit;
  END IF;
  IF v_balance <> 70 OR v_due <> 0 THEN
    RAISE EXCEPTION 'same-technician final balances incorrect: wallet %, due %', v_balance, v_due;
  END IF;
  IF (SELECT count(*) FROM public.wallet_transactions
      WHERE recharge_id IN ('10000000-0000-0000-0000-000000000007',
                            '10000000-0000-0000-0000-000000000008')) <> 3 THEN
    RAISE EXCEPTION 'same-technician concurrent approvals produced unexpected ledger row count';
  END IF;
  RAISE NOTICE 'PASS: distinct concurrent recharges serialized on technician row without over-settlement';
END $$;
DROP TRIGGER trg_test_delay_concurrent_recharge_update ON public.wallet_recharges;
DROP FUNCTION public.test_delay_concurrent_recharge_update();
