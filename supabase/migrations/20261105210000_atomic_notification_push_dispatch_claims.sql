-- Serialize concurrent sender invocations for each notification/device pair.
ALTER TABLE public.notification_push_token_deliveries
  ADD COLUMN IF NOT EXISTS dispatch_lease_until timestamptz;

CREATE INDEX IF NOT EXISTS notification_push_token_dispatch_lease_idx
  ON public.notification_push_token_deliveries (dispatch_lease_until)
  WHERE status IN ('pending', 'retryable');

CREATE OR REPLACE FUNCTION public.claim_notification_push_dispatch(
  p_notification_id uuid,
  p_fcm_token_id uuid,
  p_lease_seconds integer DEFAULT 180
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_claimed integer;
BEGIN
  IF p_notification_id IS NULL OR p_fcm_token_id IS NULL
     OR p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'INVALID_PUSH_DISPATCH_CLAIM_PARAMETERS';
  END IF;

  UPDATE public.notification_push_token_deliveries
     SET dispatch_lease_until = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
   WHERE notification_id = p_notification_id
     AND fcm_token_id = p_fcm_token_id
     AND status IN ('pending', 'retryable')
     AND (dispatch_lease_until IS NULL OR dispatch_lease_until <= now());
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_push_dispatch(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_dispatch(uuid, uuid, integer) TO service_role;
