-- Per-device FCM outcomes make partial retries safe: accepted devices are never selected again.
CREATE TABLE IF NOT EXISTS public.notification_push_token_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  fcm_token_id uuid NOT NULL REFERENCES public.fcm_tokens(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'retryable', 'terminal')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  last_error_code text,
  provider_accepted_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, fcm_token_id)
);

CREATE INDEX IF NOT EXISTS notification_push_token_deliveries_due_idx
  ON public.notification_push_token_deliveries (next_attempt_at, lease_until)
  WHERE status IN ('pending', 'retryable');

ALTER TABLE public.notification_push_token_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_push_token_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_push_token_deliveries TO service_role;

-- Claim due failed/pending devices with a lease. Concurrent workers cannot claim the same row.
CREATE OR REPLACE FUNCTION public.claim_notification_push_retries(
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
  reference_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 500 OR p_lease_seconds < 15 OR p_lease_seconds > 900
     OR p_max_attempts < 1 OR p_max_attempts > 10 THEN
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
    RETURNING d.id, d.notification_id, d.fcm_token_id
  )
  SELECT c.id, n.id, c.fcm_token_id, n.recipient_type, n.recipient_id,
         n.title, n.message, n.type, n.reference_type, n.reference_id
  FROM claimed c
  JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_push_retries(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_retries(integer, integer, integer) TO service_role;

-- Release a claimed row when the sender cannot begin/record an attempt (e.g. credentials unavailable).
CREATE OR REPLACE FUNCTION public.defer_notification_push_retry(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_attempts integer;
BEGIN
  UPDATE public.notification_push_token_deliveries
     SET attempt_count = attempt_count + 1,
         status = CASE WHEN attempt_count + 1 >= 5 THEN 'terminal' ELSE 'retryable' END,
         next_attempt_at = now() + make_interval(secs => LEAST(3600, 30 * (2 ^ LEAST(attempt_count, 7))::integer)),
         lease_until = NULL,
         last_error_code = 'RETRY_DISPATCH_FAILED',
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = p_delivery_id
     AND status IN ('pending', 'retryable')
     AND lease_until IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.defer_notification_push_retry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_notification_push_retry(uuid) TO service_role;
