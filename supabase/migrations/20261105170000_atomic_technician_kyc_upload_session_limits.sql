-- Atomic rolling one-hour cap for technician KYC upload sessions.
-- Per-mobile advisory transaction locks serialize concurrent requests; each accepted
-- session has its own token so a failed OTP-row insert can release only its slot.
CREATE TABLE IF NOT EXISTS public.technician_kyc_upload_session_reservations (
  mobile text NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  reservation_token uuid NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (mobile, reservation_token)
);
CREATE INDEX IF NOT EXISTS idx_technician_kyc_upload_reservations_window
  ON public.technician_kyc_upload_session_reservations (mobile, reserved_at);

ALTER TABLE public.technician_kyc_upload_session_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_kyc_upload_session_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_kyc_upload_session_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_technician_kyc_upload_session(
  p_mobile text,
  p_reservation_token uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_mobile IS NULL OR p_mobile !~ '^[6-9][0-9]{9}$' OR p_reservation_token IS NULL THEN
    RAISE EXCEPTION 'Invalid technician KYC upload reservation arguments';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_mobile, 0));

  DELETE FROM public.technician_kyc_upload_session_reservations
   WHERE mobile = p_mobile
     AND reserved_at <= pg_catalog.clock_timestamp() - interval '1 hour';

  SELECT count(*)::integer INTO v_count
    FROM public.technician_kyc_upload_session_reservations
   WHERE mobile = p_mobile
     AND reserved_at > pg_catalog.clock_timestamp() - interval '1 hour';

  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  INSERT INTO public.technician_kyc_upload_session_reservations (mobile, reservation_token)
  VALUES (p_mobile, p_reservation_token);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_technician_kyc_upload_session(
  p_mobile text,
  p_reservation_token uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released boolean := false;
BEGIN
  IF p_mobile IS NULL OR p_mobile !~ '^[6-9][0-9]{9}$' OR p_reservation_token IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.technician_kyc_upload_session_reservations
   WHERE mobile = p_mobile AND reservation_token = p_reservation_token
  RETURNING true INTO v_released;
  RETURN coalesce(v_released, false);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_technician_kyc_upload_session(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_technician_kyc_upload_session(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_technician_kyc_upload_session(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_technician_kyc_upload_session(text, uuid) TO service_role;
