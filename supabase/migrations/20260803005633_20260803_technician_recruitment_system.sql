/*
# Technician Recruitment System Upgrade

## Overview
Adds comprehensive technician recruitment fields, document storage, training videos,
and profile scoring to support the AI-powered technician registration assistant.

## 1. New Columns on `technicians` Table
- `whatsapp_number` (text) — WhatsApp contact number
- `area` (text) — Specific area/locality within city
- `pincode` (text) — PIN code for precise location
- `available_days` (text[]) — Days available (e.g. ['Mon','Tue','Wed'])
- `working_time` (text) — Working hours (e.g. "9:00 AM - 6:00 PM")
- `has_vehicle` (boolean, default false) — Whether technician owns a vehicle
- `has_tools` (boolean, default false) — Whether technician owns tools
- `upi_id` (text) — UPI payment ID
- `bank_account_number` (text) — Bank account number
- `bank_ifsc` (text) — Bank IFSC code
- `bank_name` (text) — Bank name
- `bank_holder_name` (text) — Account holder name
- `aadhaar_url` (text) — URL to uploaded Aadhaar document
- `pan_url` (text) — URL to uploaded PAN document
- `dl_url` (text) — URL to uploaded driving license (optional)
- `profile_score` (int, default 0) — Calculated profile completeness percentage (0-100)
- `rejection_reason` (text) — Reason if application rejected
- `suspend_reason` (text) — Reason if technician suspended
- `mobile_verified` (boolean, default false) — Whether mobile was OTP verified
- `whatsapp_verified` (boolean, default false) — Whether WhatsApp number verified
- `status` CHECK constraint updated to include 'rejected' and 'suspended'

## 2. New Tables
- `technician_training_videos` — Training video library for technicians
- `technician_applications` — Full application data snapshot (for audit trail)

## 3. Security
- RLS enabled on all new tables
- Policies allow anon + authenticated CRUD (matching existing pattern)
*/

-- ============ 1. Add columns to technicians ============

DO $$ BEGIN
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS whatsapp_number text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS area text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{}';
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS working_time text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS has_vehicle boolean DEFAULT false;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS has_tools boolean DEFAULT false;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS upi_id text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_account_number text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_ifsc text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_name text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bank_holder_name text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS aadhaar_url text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS pan_url text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS dl_url text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS profile_score int DEFAULT 0;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS rejection_reason text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS suspend_reason text;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS mobile_verified boolean DEFAULT false;
  ALTER TABLE technicians ADD COLUMN IF NOT EXISTS whatsapp_verified boolean DEFAULT false;
END $$;

-- Update status CHECK constraint to include 'rejected' and 'suspended'
ALTER TABLE technicians DROP CONSTRAINT IF EXISTS technicians_status_check;
ALTER TABLE technicians ADD CONSTRAINT technicians_status_check
  CHECK (status IN ('pending','active','inactive','rejected','suspended'));

-- ============ 2. Training Videos Table ============

CREATE TABLE IF NOT EXISTS technician_training_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category text DEFAULT 'general',
  duration_minutes int,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE technician_training_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_training_videos" ON technician_training_videos;
CREATE POLICY "anon_select_training_videos" ON technician_training_videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_training_videos" ON technician_training_videos;
CREATE POLICY "anon_insert_training_videos" ON technician_training_videos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_training_videos" ON technician_training_videos;
CREATE POLICY "anon_update_training_videos" ON technician_training_videos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_training_videos" ON technician_training_videos;
CREATE POLICY "anon_delete_training_videos" ON technician_training_videos FOR DELETE
  TO anon, authenticated USING (true);

-- ============ 3. Technician Applications Table (audit trail) ============

CREATE TABLE IF NOT EXISTS technician_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  full_data jsonb NOT NULL,
  profile_score int DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE technician_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_applications" ON technician_applications;
CREATE POLICY "anon_select_applications" ON technician_applications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_applications" ON technician_applications;
CREATE POLICY "anon_insert_applications" ON technician_applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_applications" ON technician_applications;
CREATE POLICY "anon_update_applications" ON technician_applications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_applications" ON technician_applications;
CREATE POLICY "anon_delete_applications" ON technician_applications FOR DELETE
  TO anon, authenticated USING (true);

-- ============ 4. Indexes ============

CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_city ON technicians(city);
CREATE INDEX IF NOT EXISTS idx_technicians_profile_score ON technicians(profile_score);
CREATE INDEX IF NOT EXISTS idx_training_videos_active ON technician_training_videos(is_active, sort_order);
