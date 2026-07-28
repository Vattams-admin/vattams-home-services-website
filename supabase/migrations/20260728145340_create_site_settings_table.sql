/*
# Create site_settings table for social media and business links

1. Purpose
   Stores admin-managed site-wide links (social media profiles, WhatsApp number,
   website URL, Google Business Profile) so they can be edited from the Admin
   Dashboard without touching code. A single row (id = 1) holds all values.

2. New Table: site_settings
   - id (int, primary key, always 1 — singleton row)
   - google_business_url (text, nullable) — Google Business Profile URL
   - facebook_url (text, nullable) — Facebook Page URL
   - instagram_url (text, nullable) — Instagram Profile URL
   - twitter_url (text, nullable) — X (Twitter) Profile URL
   - youtube_url (text, nullable) — YouTube Channel URL
   - whatsapp_number (text, nullable) — WhatsApp number in international format
   - website_url (text, nullable) — Official website URL
   - updated_at (timestamptz, auto-updated)
   - updated_by (text, nullable) — who last edited

3. Security (RLS)
   - Enable RLS.
   - SELECT: public read (TO anon, authenticated) — all visitors need to see icons.
   - INSERT/UPDATE/DELETE: TO anon, authenticated — the Admin Dashboard uses the
     anon-key client with sessionStorage-based admin auth, so writes go through anon.
     This is a singleton config table, not user-scoped data.

4. Seed
   - Insert one row (id = 1) with the existing hardcoded values migrated from the
     Footer/Contact pages so nothing changes visually after deploy.

5. Notes
   - The app has no Supabase auth sign-in screen; admin auth is session-based via
     sessionStorage, so policies must allow the anon role to write.
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1,
  google_business_url text,
  facebook_url text,
  instagram_url text,
  twitter_url text,
  youtube_url text,
  whatsapp_number text,
  website_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by text,
  CONSTRAINT singleton_row CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_settings" ON site_settings;
CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_write_site_settings" ON site_settings;
CREATE POLICY "public_write_site_settings" ON site_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_site_settings" ON site_settings;
CREATE POLICY "public_update_site_settings" ON site_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_site_settings" ON site_settings;
CREATE POLICY "public_delete_site_settings" ON site_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Seed the singleton row with migrated hardcoded values
INSERT INTO site_settings (id, google_business_url, facebook_url, instagram_url, twitter_url, youtube_url, whatsapp_number, website_url, updated_by)
VALUES (
  1,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '918189800757',
  NULL,
  'system'
) ON CONFLICT (id) DO NOTHING;
