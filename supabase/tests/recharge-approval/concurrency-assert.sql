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
DROP TRIGGER trg_test_delay_concurrent_recharge_update ON public.wallet_recharges;
DROP FUNCTION public.test_delay_concurrent_recharge_update();
