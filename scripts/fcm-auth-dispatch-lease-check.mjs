import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");

const claimAt = sender.indexOf('supabase.rpc("claim_notification_push_dispatch"');
const authTryAt = sender.indexOf("accessToken = await getFcmAccessToken(account);");
const authCatchAt = sender.indexOf("catch (error)", authTryAt);
const outcomeAt = sender.indexOf("const outcomes = await Promise.all", authCatchAt);
assert.ok(claimAt >= 0 && authTryAt > claimAt && authCatchAt > authTryAt && outcomeAt > authCatchAt,
  "FCM token acquisition must be guarded after atomic claims and before per-device sends");

const authFailure = sender.slice(authCatchAt, outcomeAt);
assert.ok(authFailure.includes('.update({ dispatch_lease_until: null') &&
  authFailure.includes('.eq("notification_id", notificationId)') &&
  authFailure.includes('.in("fcm_token_id", eligibleTokens.map') &&
  authFailure.includes('.in("status", ["pending", "retryable"])'),
  "FCM auth bootstrap failure must release only the claimed pending/retryable device leases");
assert.ok(authFailure.includes("perDeviceTracking: false") && authFailure.includes("}, 503)"),
  "FCM auth bootstrap failure must signal the retry worker to defer and back off");
assert.ok(worker.includes("if (payload?.perDeviceTracking !== true)") &&
  worker.includes("const deferSucceeded = await deferClaim(claim.delivery_id)"),
  "retry worker must defer the claimed delivery when sender bootstrap did not begin tracked delivery");

console.log("PASS FCM auth bootstrap failures release dispatch leases and enter retry backoff");
