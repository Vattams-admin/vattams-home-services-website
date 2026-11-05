-- Remove broad browser-role writes to public technician profile photos.
-- Uploads are now performed by technician-auth using the short-lived registration
-- draft capability and service_role. Public SELECT remains for profile display.
DROP POLICY IF EXISTS "anon_insert_technician_photos" ON storage.objects;
DROP POLICY IF EXISTS "anon_update_technician_photos" ON storage.objects;
