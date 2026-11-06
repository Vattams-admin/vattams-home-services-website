-- Release both worker and sender leases when a retry dispatch is deferred.
-- A dispatch that never reached FCM must not remain blocked by an abandoned sender lease.
CREATE OR REPLACE FUNCTION public.defer_notification_push_retry(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
     AND lease_until IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.defer_notification_push_retry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_notification_push_retry(uuid) TO service_role;
