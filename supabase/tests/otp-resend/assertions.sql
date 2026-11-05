\set ON_ERROR_STOP on
TRUNCATE public.otp_resend_reservations;
DO $$
DECLARE
  first_token uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  second_token uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
BEGIN
  IF NOT public.reserve_otp_resend('9876543210','registration',first_token) THEN
    RAISE EXCEPTION 'first reservation should succeed';
  END IF;
  IF public.reserve_otp_resend('9876543210','registration',second_token) THEN
    RAISE EXCEPTION 'second reservation inside cooldown must fail';
  END IF;
  IF public.release_otp_resend('9876543210','registration',second_token) THEN
    RAISE EXCEPTION 'wrong token must not release reservation';
  END IF;
  IF NOT public.release_otp_resend('9876543210','registration',first_token) THEN
    RAISE EXCEPTION 'matching token should release reservation';
  END IF;
  IF NOT public.reserve_otp_resend('9876543210','registration',second_token) THEN
    RAISE EXCEPTION 'reservation should succeed after release';
  END IF;
END $$;
TRUNCATE public.otp_resend_reservations;
