-- Fence retry-worker mutations with the exact lease returned to the claimant.
-- A worker whose lease expired must not alter a row reclaimed by a newer worker.
ALTER TABLE public.notification_push_token_deliveries
  ADD COLUMN IF NOT EXISTS dispatch_lease_until timestamptz;

DROP FUNCTION IF EXISTS public.claim_notification_push_retries(integer, integer, integer);
CREATE FUNCTION public.claim_notification_push_retries(
  p_limit integer DEFAULT 100,
  p_lease_seconds integer DEFAULT 120,
  p_max_attempts integer DEFAULT 5
) RETURNS TABLE (
  delivery_id uuid,
  notification_id uuid,
  fcm_token_id uuid,
  recipient_type text,
  recipient_id text,
  title text,
  message text,
  notification_type text,
  reference_type text,
  reference_id text,
  lease_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500
     OR p_lease_seconds IS NULL OR p_lease_seconds < 15 OR p_lease_seconds > 900
     OR p_max_attempts IS NULL OR p_max_attempts < 1 OR p_max_attempts > 10 THEN
    RAISE EXCEPTION 'INVALID_RETRY_CLAIM_PARAMETERS';
  END IF;

  UPDATE public.notification_push_token_deliveries d
     SET status = 'terminal', lease_until = NULL,
         last_error_code = COALESCE(last_error_code, 'MAX_ATTEMPTS_EXCEEDED'),
         updated_at = now()
   WHERE d.status IN ('pending', 'retryable')
     AND d.attempt_count >= p_max_attempts;

  RETURN QUERY
  WITH due AS (
    SELECT d.id
    FROM public.notification_push_token_deliveries d
    WHERE d.status IN ('pending', 'retryable')
      AND d.next_attempt_at <= now()
      AND (d.lease_until IS NULL OR d.lease_until <= now())
      AND d.attempt_count < p_max_attempts
    ORDER BY d.next_attempt_at, d.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.notification_push_token_deliveries d
    SET lease_until = now() + make_interval(secs => p_lease_seconds),
        updated_at = now()
    FROM due
    WHERE d.id = due.id
    RETURNING d.id, d.notification_id, d.fcm_token_id, d.lease_until
  )
  SELECT c.id, n.id, c.fcm_token_id, n.recipient_type, n.recipient_id,
         n.title, n.message, n.type, n.reference_type, n.reference_id, c.lease_until
  FROM claimed c
  JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_push_retries(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_retries(integer, integer, integer) TO service_role;

DROP FUNCTION IF EXISTS public.defer_notification_push_retry(uuid);
CREATE FUNCTION public.defer_notification_push_retry(
  p_delivery_id uuid,
  p_expected_lease_until timestamptz
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_updated integer;
BEGIN
  IF p_delivery_id IS NULL OR p_expected_lease_until IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.notification_push_token_deliveries
     SET attempt_count = attempt_count + 1,
         status = CASE WHEN attempt_count + 1 >= 5 THEN 'terminal' ELSE 'retryable' END,
         next_attempt_at = now() + make_interval(secs => LEAST(3600, 30 * (2 ^ LEAST(attempt_count, 7))::integer)),
         lease_until = NULL,
         dispatch_lease_until = NULL,
         last_error_code = 'RETRY_DISPATCH_FAILED',
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = p_delivery_id
     AND status IN ('pending', 'retryable')
     AND lease_until = p_expected_lease_until
     AND lease_until > now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.defer_notification_push_retry(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_notification_push_retry(uuid, timestamptz) TO service_role;

DROP FUNCTION IF EXISTS public.terminalize_notification_push_retry(uuid);
CREATE FUNCTION public.terminalize_notification_push_retry(
  p_delivery_id uuid,
  p_expected_lease_until timestamptz
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_updated integer;
BEGIN
  IF p_delivery_id IS NULL OR p_expected_lease_until IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.notification_push_token_deliveries
     SET status = 'terminal',
         lease_until = NULL,
         dispatch_lease_until = NULL,
         last_error_code = 'FCM_TOKEN_INACTIVE_OR_MISSING',
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = p_delivery_id
     AND status IN ('pending', 'retryable')
     AND lease_until = p_expected_lease_until
     AND lease_until > now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.terminalize_notification_push_retry(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terminalize_notification_push_retry(uuid, timestamptz) TO service_role;
