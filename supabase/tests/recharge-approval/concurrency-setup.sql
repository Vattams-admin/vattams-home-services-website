-- Seed a recharge dedicated to the concurrent-approval test.
INSERT INTO public.wallet_settings(id, lock_threshold)
VALUES (1, 0) ON CONFLICT (id) DO UPDATE SET lock_threshold=EXCLUDED.lock_threshold;
INSERT INTO public.technicians(id, commission_due, wallet_balance)
VALUES ('00000000-0000-0000-0000-000000000006', 0, 10);
INSERT INTO public.wallet_recharges(id, technician_id, amount, status, approved_by)
VALUES ('10000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000006', 75, 'pending', 'concurrency-test');

-- Keep the first UPDATE inside its row-level critical section long enough
-- for the second independent PostgreSQL session to contend for the same row.
CREATE OR REPLACE FUNCTION public.test_delay_concurrent_recharge_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id = '10000000-0000-0000-0000-000000000006'
     AND NEW.status = 'approved' THEN
    PERFORM pg_sleep(2);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_test_delay_concurrent_recharge_update
BEFORE UPDATE ON public.wallet_recharges
FOR EACH ROW EXECUTE FUNCTION public.test_delay_concurrent_recharge_update();
