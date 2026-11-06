-- Stop retrying delivery rows whose FCM token is no longer active.
CREATE OR REPLACE FUNCTION public.terminalize_notification_push_retry(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_push_token_deliveries
     SET status = 'terminal',
         lease_until = NULL,
         dispatch_lease_until = NULL,
         last_error_code = 'FCM_TOKEN_INACTIVE_OR_MISSING',
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = p_delivery_id
     AND status IN ('pending', 'retryable')
     AND lease_until IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.terminalize_notification_push_retry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terminalize_notification_push_retry(uuid) TO service_role;
