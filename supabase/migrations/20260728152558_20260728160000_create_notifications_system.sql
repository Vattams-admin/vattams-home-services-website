-- Unified notification system for VATTAMS Home Services
-- Supports customer, technician, and admin notifications with real-time delivery.

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who the notification is for
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer','technician','admin')),
  -- For customer: mobile number; for technician: technician id; for admin: 'admin' (all admins share)
  recipient_id text NOT NULL,
  -- Notification content
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- booking_received, technician_assigned, job_assigned, wallet_recharge_approved, etc.
  -- Related entity for deep-linking
  reference_type text, -- booking, technician, wallet_recharge, payment, etc.
  reference_id text,
  -- Metadata for future email/sms/whatsapp channels
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  -- Audit / status tracking
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (recipient_type, recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- This app uses sessionStorage-based auth (no Supabase Auth), so policies are public.
-- All notification CRUD is allowed for anon + authenticated (the anon-key client).
CREATE POLICY "public_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();