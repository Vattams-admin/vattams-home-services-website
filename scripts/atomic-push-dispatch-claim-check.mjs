import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261105210000_atomic_notification_push_dispatch_claims.sql", import.meta.url), "utf8");
const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");

assert.ok(migration.includes("dispatch_lease_until") && migration.includes("claim_notification_push_dispatch"),
  "migration must add per-device dispatch lease and atomic claim RPC");
assert.ok(migration.includes("status IN ('pending', 'retryable')") &&
  migration.includes("dispatch_lease_until IS NULL OR dispatch_lease_until <= now()"),
  "claim must only reserve eligible rows whose dispatch lease is absent or expired");
assert.ok(migration.includes("GET DIAGNOSTICS v_claimed = ROW_COUNT") &&
  migration.includes("RETURN v_claimed = 1"),
  "claim RPC must return true only to the single successful updater");
assert.ok(migration.includes("p_lease_seconds < 30 OR p_lease_seconds > 900"),
  "claim RPC must bound its lease duration");
const claimStart = sender.indexOf('supabase.rpc("claim_notification_push_dispatch"');
const accessToken = sender.indexOf("let accessToken: string;");
assert.ok(claimStart >= 0 && accessToken > claimStart,
  "sender must acquire atomic dispatch claims before obtaining FCM access token");
assert.ok(sender.includes("eligibleTokens = claimResults.filter((result) => result.claimed)") &&
  sender.includes("dispatch_lease_until: null"),
  "sender must send only claimed tokens and clear dispatch lease after outcome persistence");

console.log("PASS atomic per-device push dispatch claim contract");
