import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = await readFile(new URL("../supabase/functions/admin-data/index.ts", import.meta.url), "utf8");
assert.match(source, /Booking OTPs and action capabilities must never reach browser clients/);
assert.match(source, /\/(\^\|_\)\(otp\|otp_code\|verification_code\|booking_action_token\)\(_\|\$\)\/i\.test\(key\)/);
assert.match(source, /payment_action_token/);
assert.match(source, /password_hash/);
process.stdout.write("PASS admin-data sensitive OTP and capability redaction contract\\n");
