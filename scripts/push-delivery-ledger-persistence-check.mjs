import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");

assert.ok(sender.includes("error: priorError") && sender.includes("if (priorError || !prior)"),
  "sender must not silently treat a failed/missing prior ledger lookup as a valid outcome");
assert.ok(sender.includes("trackingFailed = true") && sender.includes("per-device outcome persistence failed"),
  "sender must track failed delivery-ledger writes");
assert.ok(sender.includes("const trackingFailures = outcomes.filter((outcome) => outcome.trackingFailed).length"),
  "sender must aggregate per-device ledger persistence failures");
assert.ok(sender.includes("trackingFailures > 0 ? 503"),
  "sender must return service-unavailable when it cannot persist delivery outcomes");
assert.ok(worker.includes("payload?.trackingFailures") && worker.includes("const trackingFailures = results.reduce"),
  "retry worker must aggregate sender ledger persistence failures");
assert.ok(worker.includes("providerFailures > 0 || trackingFailures > 0 || senderFailures > 0 ? 502 : 200"),
  "retry worker must surface ledger persistence failures to scheduler monitoring");

console.log("PASS push delivery ledger persistence failures are surfaced end-to-end");
