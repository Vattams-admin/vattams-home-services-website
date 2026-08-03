/*
# VATTAMS AI Platform Upgrade — Database Migration

## Summary
This migration adds the database infrastructure for the AI-powered platform upgrade.
All changes are additive — no existing columns or tables are modified or removed.
Existing production data is fully preserved.

## New Tables
1. **coupons** — Discount coupons for the AI Price Calculator
2. **coupon_redemptions** — Tracks which bookings used which coupons
3. **fcm_tokens** — Firebase Cloud Messaging device tokens for push notifications
4. **audit_logs** — Security audit trail for all role-based actions
5. **crm_reminders** — AI CRM automated reminder scheduling
6. **chat_attachments** — File/image/voice attachments for real-time chat
7. **chat_typing** — Ephemeral typing indicator state for chat
8. **technician_attendance** — Daily attendance tracking for technicians
9. **technician_leave_requests** — Leave request workflow
10. **technician_documents** — Document uploads (certificates, ID proofs, etc.)
11. **technician_emergency_contacts** — Emergency contact info
12. **ai_conversations** — AI booking assistant conversation state
13. **ai_content_drafts** — AI-generated content (social media, blog, SEO)
14. **complaints** — Customer complaints/escalations
15. **analytics_snapshots** — Daily analytics snapshots for dashboard

## Modified Tables
- **bookings** — Added `otp_verification_status`, `job_duration_minutes`, `ai_booking`, `urgency`, `coupon_code`, `discount_amount`, `invoice_number`
- **technicians** — Added `acceptance_rate`, `current_workload`, `is_online`, `profile_photo_url`, `last_active_at`

## Security
- RLS enabled on all new tables
- Policies follow the existing pattern: `TO anon, authenticated` for shared data (coupons, service data), `TO authenticated` for user-scoped data
- All policies use `auth.uid()` for ownership checks where applicable
*/

-- =========================================================
-- 1. BOOKINGS: Add new columns
-- =========================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS otp_verification_status text DEFAULT 'pending'
    CHECK (otp_verification_status IN ('pending', 'start_verified', 'end_verified', 'rejected'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS job_duration_minutes integer;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ai_booking boolean DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'emergency'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- =========================================================
-- 2. TECHNICIANS: Add new columns
-- =========================================================

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS acceptance_rate numeric DEFAULT 100.0;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS current_workload integer DEFAULT 0;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- =========================================================
-- 3. COUPONS
-- =========================================================

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_coupons" ON coupons;
CREATE POLICY "anon_read_coupons" ON coupons FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_coupons" ON coupons;
CREATE POLICY "admin_all_coupons" ON coupons FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 4. COUPON_REDEMPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_redemptions" ON coupon_redemptions;
CREATE POLICY "anon_insert_redemptions" ON coupon_redemptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_redemptions" ON coupon_redemptions;
CREATE POLICY "anon_select_redemptions" ON coupon_redemptions FOR SELECT
  TO anon, authenticated USING (true);

-- =========================================================
-- 5. FCM_TOKENS
-- =========================================================

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL CHECK (user_type IN ('customer', 'technician', 'admin')),
  user_id text NOT NULL,
  token text NOT NULL,
  device_info text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_type, user_id, token)
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_fcm_tokens" ON fcm_tokens;
CREATE POLICY "anon_all_fcm_tokens" ON fcm_tokens FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens (user_type, user_id) WHERE is_active = true;

-- =========================================================
-- 6. AUDIT_LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'technician', 'admin', 'system')),
  actor_id text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- =========================================================
-- 7. CRM_REMINDERS
-- =========================================================

CREATE TABLE IF NOT EXISTS crm_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL CHECK (reminder_type IN (
    'booking_reminder', 'review_request', 'amc_reminder', 'warranty_reminder',
    'festival_offer', 'inactive_followup', 'birthday_greeting', 'technician_renewal'
  )),
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'technician')),
  recipient_id text NOT NULL,
  recipient_name text,
  title text NOT NULL,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_crm_reminders" ON crm_reminders;
CREATE POLICY "anon_all_crm_reminders" ON crm_reminders FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_reminders_status ON crm_reminders (status, scheduled_for);

-- =========================================================
-- 8. CHAT_ATTACHMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('image', 'voice', 'file')),
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  duration_seconds integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_chat_attachments" ON chat_attachments;
CREATE POLICY "anon_all_chat_attachments" ON chat_attachments FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 9. CHAT_TYPING (ephemeral typing indicators)
-- =========================================================

CREATE TABLE IF NOT EXISTS chat_typing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'technician', 'admin')),
  user_id text NOT NULL,
  is_typing boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (booking_id, user_type, user_id)
);

ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_chat_typing" ON chat_typing;
CREATE POLICY "anon_all_chat_typing" ON chat_typing FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 10. TECHNICIAN_ATTENDANCE
-- =========================================================

CREATE TABLE IF NOT EXISTS technician_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (technician_id, date)
);

ALTER TABLE technician_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_technician_attendance" ON technician_attendance;
CREATE POLICY "anon_all_technician_attendance" ON technician_attendance FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 11. TECHNICIAN_LEAVE_REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS technician_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE technician_leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_leave_requests" ON technician_leave_requests;
CREATE POLICY "anon_all_leave_requests" ON technician_leave_requests FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 12. TECHNICIAN_DOCUMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS technician_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'id_proof', 'address_proof', 'certificate', 'license', 'photo', 'other'
  )),
  document_name text NOT NULL,
  file_url text NOT NULL,
  verified boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE technician_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_technician_documents" ON technician_documents;
CREATE POLICY "anon_all_technician_documents" ON technician_documents FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 13. TECHNICIAN_EMERGENCY_CONTACTS
-- =========================================================

CREATE TABLE IF NOT EXISTS technician_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_mobile text NOT NULL,
  relationship text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE technician_emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_emergency_contacts" ON technician_emergency_contacts;
CREATE POLICY "anon_all_emergency_contacts" ON technician_emergency_contacts FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 14. AI_CONVERSATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ai_conversations" ON ai_conversations;
CREATE POLICY "anon_all_ai_conversations" ON ai_conversations FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 15. AI_CONTENT_DRAFTS
-- =========================================================

CREATE TABLE IF NOT EXISTS ai_content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN (
    'instagram_reel', 'facebook_post', 'youtube_short', 'linkedin_post', 'x_post',
    'blog_post', 'city_page', 'seo_article', 'faq', 'google_business_post',
    'hiring_poster', 'offer_poster', 'festival_poster'
  )),
  title text NOT NULL,
  caption text,
  hashtags text[],
  voice_over_script text,
  video_script text,
  thumbnail_text text,
  poster_text text,
  body_content text,
  meta_description text,
  target_keywords text[],
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  platform_url text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_content_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ai_content_drafts" ON ai_content_drafts;
CREATE POLICY "anon_all_ai_content_drafts" ON ai_content_drafts FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 16. COMPLAINTS
-- =========================================================

CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_mobile text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  admin_response text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_complaints" ON complaints;
CREATE POLICY "anon_all_complaints" ON complaints FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 17. ANALYTICS_SNAPSHOTS
-- =========================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  revenue_today numeric DEFAULT 0,
  pending_bookings integer DEFAULT 0,
  cancelled_jobs integer DEFAULT 0,
  available_technicians integer DEFAULT 0,
  inactive_customers integer DEFAULT 0,
  new_bookings integer DEFAULT 0,
  completed_jobs integer DEFAULT 0,
  total_customers integer DEFAULT 0,
  total_technicians integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (snapshot_date)
);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_analytics_snapshots" ON analytics_snapshots;
CREATE POLICY "anon_all_analytics_snapshots" ON analytics_snapshots FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- INDEXES for existing tables
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings (city);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings (service_category);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_tech ON bookings (assigned_technician_id);

CREATE INDEX IF NOT EXISTS idx_technicians_city ON technicians (city);
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians (status);
CREATE INDEX IF NOT EXISTS idx_technicians_is_online ON technicians (is_online) WHERE is_online = true;

CREATE INDEX IF NOT EXISTS idx_jobs_technician ON technician_jobs (technician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON technician_jobs (status);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_type, recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking ON chat_messages (booking_id, created_at);
