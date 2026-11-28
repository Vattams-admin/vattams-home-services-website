import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = await readFile(new URL("../supabase/functions/admin-data/index.ts", import.meta.url), "utf8");
assert.ok(source.includes("Booking OTPs and action capabilities must never reach browser clients"));
assert.ok(source.includes("if (/(^|_)(otp|otp_code|verification_code|booking_action_token)(_|$)/i.test(key)) continue;"));
assert.ok(source.includes('"payment_action_token"'));
assert.ok(source.includes('"password_hash"'));
process.stdout.write("PASS admin-data sensitive OTP and capability redaction contract\n");
