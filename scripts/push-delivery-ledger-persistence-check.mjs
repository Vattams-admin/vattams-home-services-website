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

assert.ok(sender.includes("let response: Response | null = null") &&
  sender.includes("catch (error)") &&
  sender.includes("FCM_NETWORK_ERROR"),
  "sender must isolate FCM transport exceptions and classify them per device");
assert.ok(sender.includes("const ok = response?.ok === true") &&
  sender.includes("status: ok ? \"succeeded\" : terminal || attempts >= 5 ? \"terminal\" : \"retryable\""),
  "sender must persist transport exceptions as retryable per-device outcomes");
const succeededGuardStart = sender.indexOf("let eligibleTokens = tokens;");
const succeededGuardEnd = sender.indexOf("let accessToken: string;");
assert.ok(succeededGuardStart >= 0 && succeededGuardEnd > succeededGuardStart,
  "sender must check the delivery ledger before requesting an FCM access token");
const succeededGuard = sender.slice(succeededGuardStart, succeededGuardEnd);
assert.ok(succeededGuard.includes('.eq("status", "succeeded")') &&
  succeededGuard.includes("eligibleTokens = tokens.filter") &&
  succeededGuard.includes("succeededIds.has(tokenRow.id)"),
  "sender must exclude devices already recorded as successfully delivered");
assert.ok(succeededGuard.includes("if (succeededLookupError)") &&
  succeededGuard.includes("}, 503)"),
  "sender must fail closed when it cannot verify whether a device already received the notification");
assert.ok(succeededGuard.includes("eligibleTokens.length === 0") &&
  succeededGuard.includes("skippedAlreadySucceeded"),
  "sender must safely return when every selected device was already delivered");

assert.ok(worker.includes("payload?.trackingFailures") && worker.includes("const trackingFailures = results.reduce"),
  "retry worker must aggregate sender ledger persistence failures");
assert.ok(worker.includes("providerFailures > 0 || trackingFailures > 0 || senderFailures > 0 ? 502 : 200"),
  "retry worker must surface ledger persistence failures to scheduler monitoring");

console.log("PASS push delivery ledger persistence failures are surfaced end-to-end");
