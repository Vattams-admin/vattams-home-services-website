/*
# Create support_messages table for customer support

1. New Tables
   - `support_messages`
     - `id` (uuid, primary key)
     - `customer_id` (uuid, FK to customers)
     - `customer_name` (text)
     - `customer_mobile` (text)
     - `subject` (text, not null)
     - `message` (text, not null)
     - `status` (text, default 'open') — 'open' | 'responded' | 'closed'
     - `admin_response` (text, nullable)
     - `created_at` (timestamptz)

2. Security
   - RLS enabled, anon + authenticated CRUD (app uses anon key)
*/

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_mobile text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
  admin_response text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_customer ON support_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_messages(status);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_support" ON support_messages;
CREATE POLICY "public_select_support" ON support_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_support" ON support_messages;
CREATE POLICY "public_insert_support" ON support_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_support" ON support_messages;
CREATE POLICY "public_update_support" ON support_messages FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_support" ON support_messages;
CREATE POLICY "public_delete_support" ON support_messages FOR DELETE
TO anon, authenticated USING (true);
