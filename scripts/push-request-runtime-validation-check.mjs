import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");
const validationStart = sender.indexOf('if (!["customer", "technician", "admin"].includes(userType)');
const validationEnd = sender.indexOf('return json({ error: "Missing or invalid required fields" }, 400);', validationStart);
assert.ok(validationStart >= 0 && validationEnd > validationStart, "sender must retain a centralized request validation guard");
const validation = sender.slice(validationStart, validationEnd);
for (const field of ["userId", "title", "body"]) {
  assert.ok(validation.includes(`typeof ${field} !== "string"`), `sender must reject non-string ${field} values with HTTP 400`);
}
assert.ok(validation.includes('typeof notificationId !== "string"'), "sender must type-check notificationId before applying the UUID regex");
assert.ok(validation.includes('typeof id !== "string"'), "sender must type-check each FCM token ID before applying the UUID regex");
assert.ok(validation.indexOf('typeof title !== "string"') < validation.indexOf("!title.trim()"), "title type validation must precede trim()");
assert.ok(validation.indexOf('typeof body !== "string"') < validation.indexOf("!body.trim()"), "body type validation must precede trim()");

console.log("PASS push sender rejects malformed runtime string fields as HTTP 400");
