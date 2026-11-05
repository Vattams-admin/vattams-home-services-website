DO $$
DECLARE
  v_token uuid;
  v_count integer;
BEGIN
  SELECT reservation_token INTO v_token
  FROM public.otp_resend_reservations
  WHERE mobile='9876543210' AND purpose='registration';
  IF v_token IS NULL THEN RAISE EXCEPTION 'concurrent reservation missing'; END IF;
  IF v_token NOT IN (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  ) THEN RAISE EXCEPTION 'unexpected reservation token'; END IF;
  SELECT count(*) INTO v_count FROM public.otp_resend_reservations
  WHERE mobile='9876543210' AND purpose='registration';
  IF v_count <> 1 THEN RAISE EXCEPTION 'expected exactly one reservation row, got %', v_count; END IF;
END $$;
