-- Mark both technician notification streams read in one database transaction.
-- Callable only by the trusted service role through the technician-data Edge Function.
CREATE OR REPLACE FUNCTION public.mark_technician_notifications_read_all(p_technician_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_rows integer := 0;
  job_rows integer := 0;
BEGIN
  IF p_technician_id IS NULL THEN
    RAISE EXCEPTION 'TECHNICIAN_ID_REQUIRED';
  END IF;

  UPDATE public.technician_notifications
     SET is_read = true
   WHERE technician_id = p_technician_id
     AND is_read IS DISTINCT FROM true;
  GET DIAGNOSTICS wallet_rows = ROW_COUNT;

  UPDATE public.notifications
     SET is_read = true,
         read_at = now(),
         status = 'read'
   WHERE recipient_type = 'technician'
     AND recipient_id = p_technician_id::text
     AND is_read IS DISTINCT FROM true;
  GET DIAGNOSTICS job_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'technician_notifications_updated', wallet_rows,
    'job_notifications_updated', job_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_technician_notifications_read_all(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_technician_notifications_read_all(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_technician_notifications_read_all(uuid) TO service_role;
