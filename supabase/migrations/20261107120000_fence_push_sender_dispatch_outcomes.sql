-- Fence sender-side delivery writes to the exact per-device dispatch claim.
-- A sender that outlives its lease must not overwrite a newer sender's outcome.
ALTER TABLE public.notification_push_token_deliveries
  ADD COLUMN IF NOT EXISTS dispatch_lease_token uuid;

DROP FUNCTION IF EXISTS public.claim_notification_push_dispatch(uuid, uuid, integer);
CREATE FUNCTION public.claim_notification_push_dispatch(
  p_notification_id uuid,
  p_fcm_token_id uuid,
  p_lease_seconds integer DEFAULT 180
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_token uuid := gen_random_uuid();
  v_claimed integer;
BEGIN
  IF p_notification_id IS NULL OR p_fcm_token_id IS NULL
     OR p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'INVALID_PUSH_DISPATCH_CLAIM_PARAMETERS';
  END IF;

  UPDATE public.notification_push_token_deliveries
     SET dispatch_lease_until = now() + make_interval(secs => p_lease_seconds),
         dispatch_lease_token = v_claim_token,
         updated_at = now()
   WHERE notification_id = p_notification_id
     AND fcm_token_id = p_fcm_token_id
     AND status IN ('pending', 'retryable')
     AND (dispatch_lease_until IS NULL OR dispatch_lease_until <= now());
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 1 THEN
    RETURN v_claim_token;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_push_dispatch(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_dispatch(uuid, uuid, integer) TO service_role;

CREATE INDEX IF NOT EXISTS notification_push_token_dispatch_token_idx
  ON public.notification_push_token_deliveries (dispatch_lease_token)
  WHERE dispatch_lease_token IS NOT NULL;
