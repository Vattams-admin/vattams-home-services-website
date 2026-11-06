import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");
const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");

assert.ok(worker.includes("Number.isInteger(payload?.failed) && payload.failed >= 0"),
  "retry worker must validate the sender's per-device failed count");
assert.ok(worker.includes("const providerFailures = Number.isInteger(payload?.failed)"),
  "retry worker must retain provider failures from partial HTTP-200 sender responses");
assert.ok(worker.includes("const providerFailures = results.reduce((total, item) => total + (item.providerFailures || 0), 0)"),
  "retry worker must aggregate per-device provider failures");
assert.ok(worker.includes("providerFailures > 0 || trackingFailures > 0 || senderFailures > 0 ? 502 : 200"),
  "retry worker must return a non-2xx status when any provider delivery failed");
assert.ok(worker.includes("deferFailures > 0 || terminalizationFailures > 0 || inFlight > 0 ? 500"),
  "retry worker must return a non-2xx status for failed deferrals, terminalization, or in-flight conflicts");

console.log("PASS retry worker surfaces partial FCM failures to scheduler monitoring");

assert.ok(worker.includes('if (payload?.inFlight === true)'),
  "retry worker must recognize a sender blocked by another active dispatch lease");
assert.ok(worker.includes('const inFlight = results.filter((item) => item.inFlight === true).length;'),
  "retry worker must aggregate in-flight dispatch conflicts");
assert.ok(worker.includes('terminalizationFailures > 0 || inFlight > 0 ? 500'),
  "in-flight retries must not be reported as successful scheduler batches");
assert.ok(worker.includes('// clearing that lease could permit a duplicate FCM send.'),
  "in-flight retry handling must preserve the other sender's dispatch lease");

assert.ok(sender.includes('skippedInFlight > 0 ? 409 : 200'),
  "sender must return a conflict when another active dispatch lease blocks delivery");
assert.ok(sender.includes('skippedAlreadySucceeded,\n        skippedInFlight,\n        inFlight: skippedInFlight > 0'),
  "sender must distinguish confirmed successes from active in-flight claims");
