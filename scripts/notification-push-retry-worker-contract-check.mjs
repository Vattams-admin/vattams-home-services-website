import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");

assert.ok(worker.includes("Number.isInteger(payload?.failed) && payload.failed >= 0"),
  "retry worker must validate the sender's per-device failed count");
assert.ok(worker.includes("const providerFailures = Number.isInteger(payload?.failed)"),
  "retry worker must retain provider failures from partial HTTP-200 sender responses");
assert.ok(worker.includes("const providerFailures = results.reduce((total, item) => total + (item.providerFailures || 0), 0)"),
  "retry worker must aggregate per-device provider failures");
assert.ok(worker.includes("providerFailures > 0 || senderFailures > 0 ? 502 : 200"),
  "retry worker must return a non-2xx status when any provider delivery failed");
assert.ok(worker.includes("deferFailures > 0 ? 500"),
  "retry worker must continue to prioritize failed lease deferrals");

console.log("PASS retry worker surfaces partial FCM failures to scheduler monitoring");
