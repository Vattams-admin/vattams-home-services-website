import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../supabase/functions/technician-auth/index.ts", import.meta.url), "utf8");
const registration = readFileSync(new URL("../src/lib/technicianRegistration.ts", import.meta.url), "utf8");
const photoMigration = readFileSync(new URL("../supabase/migrations/20261105200000_restrict_technician_photo_browser_writes.sql", import.meta.url), "utf8");

assert.ok(auth.includes('"profile_photo"'), "Edge Function must accept profile_photo uploads");
assert.ok(auth.includes('const bucket = isProfilePhoto ? "technician-photos" : "technician-docs"'), "server must select photo bucket");
assert.ok(auth.includes('upsert: isProfilePhoto'), "only draft-bound profile photo replacement may upsert");
assert.ok(auth.includes('detected.mime === "application/pdf"'), "profile photo must reject PDF content");
assert.ok(auth.includes('getPublicUrl(data.path)'), "server must return the public photo URL");
assert.ok(auth.includes('profile_photo_url: publicPhoto.publicUrl'), "registration must derive photo URL from the validated draft");
assert.ok(registration.includes("${TECHNICIAN_AUTH_URL}/upload-kyc-document"), "browser uploads must use the Edge Function");
assert.ok(!registration.includes("/storage/v1/object/"), "browser must not write directly to Storage");
assert.ok(registration.includes("result.public_url"), "frontend must consume server-generated photo URL");
assert.ok(photoMigration.includes('DROP POLICY IF EXISTS "anon_insert_technician_photos"'));
assert.ok(photoMigration.includes('DROP POLICY IF EXISTS "anon_update_technician_photos"'));
assert.ok(!photoMigration.includes("CREATE POLICY"), "migration must not recreate browser photo write policies");

console.log("PASS technician profile photos use registration-scoped server uploads and browser writes are revoked");
