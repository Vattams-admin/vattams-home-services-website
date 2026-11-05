-- Durable per-channel notification outcomes.
-- Notifications.status remains a legacy record-level state; channel delivery rows are authoritative.
CREATE TABLE IF NOT EXISTS public.notification_channel_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app', 'push')),
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'partial', 'failed', 'skipped')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  delivered_count integer NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  error_code text,
  provider_accepted_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_channel_deliveries_notification_channel_key UNIQUE (notification_id, channel),
  CONSTRAINT notification_channel_delivery_counts_nonnegative CHECK (delivered_count >= 0 AND failed_count >= 0)
);

CREATE INDEX IF NOT EXISTS notification_channel_deliveries_status_idx
  ON public.notification_channel_deliveries (status, updated_at);

ALTER TABLE public.notification_channel_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_notification_channel_deliveries ON public.notification_channel_deliveries;
DROP POLICY IF EXISTS deny_authenticated_notification_channel_deliveries ON public.notification_channel_deliveries;
CREATE POLICY deny_anon_notification_channel_deliveries
  ON public.notification_channel_deliveries FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY deny_authenticated_notification_channel_deliveries
  ON public.notification_channel_deliveries FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE public.notification_channel_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_channel_deliveries TO service_role;

-- Create the notification and its initial channel records in one transaction.
CREATE OR REPLACE FUNCTION public.create_notification_with_channel_deliveries(
  p_recipient_type text,
  p_recipient_id text,
  p_title text,
  p_message text,
  p_type text,
  p_reference_type text,
  p_reference_id text,
  p_channels text[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  IF p_channels IS NULL OR cardinality(p_channels) = 0 OR cardinality(p_channels) > 2
     OR EXISTS (SELECT 1 FROM unnest(p_channels) AS c(channel) WHERE c.channel NOT IN ('in_app', 'push'))
     OR cardinality(p_channels) <> (SELECT count(DISTINCT c.channel) FROM unnest(p_channels) AS c(channel)) THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_CHANNELS';
  END IF;

  INSERT INTO public.notifications (
    recipient_type, recipient_id, title, message, type,
    reference_type, reference_id, channels, status, is_read
  ) VALUES (
    p_recipient_type, p_recipient_id, p_title, p_message, p_type,
    p_reference_type, p_reference_id, p_channels, 'sent', false
  ) RETURNING * INTO v_notification;

  INSERT INTO public.notification_channel_deliveries (notification_id, channel, status)
  SELECT v_notification.id, c.channel,
         CASE WHEN c.channel = 'in_app' THEN 'succeeded' ELSE 'pending' END
  FROM unnest(p_channels) AS c(channel);

  RETURN to_jsonb(v_notification);
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification_with_channel_deliveries(text, text, text, text, text, text, text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_with_channel_deliveries(text, text, text, text, text, text, text, text[]) TO service_role;
