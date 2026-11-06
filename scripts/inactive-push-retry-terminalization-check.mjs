import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261107010000_terminalize_inactive_push_retry_tokens.sql", import.meta.url), "utf8");

assert.ok(worker.includes('response.ok && payload?.message === "No active tokens"'),
  "retry worker must distinguish a successful no-active-token response from a transient sender failure");
assert.ok(worker.includes('rpc("terminalize_notification_push_retry"'),
  "retry worker must terminalize inactive-token delivery rows");
assert.ok(worker.includes("terminalized"),
  "retry worker must report whether inactive-token terminalization succeeded");
assert.ok(migration.includes("SET status = 'terminal'"), "migration must make inactive-token deliveries terminal");
assert.ok(migration.includes("lease_until = NULL") && migration.includes("dispatch_lease_until = NULL"),
  "terminalization must clear both retry and sender leases");
assert.ok(migration.includes("'FCM_TOKEN_INACTIVE_OR_MISSING'"),
  "terminalization must retain a diagnostic reason");
assert.ok(migration.includes("GRANT EXECUTE ON FUNCTION public.terminalize_notification_push_retry(uuid) TO service_role"),
  "only service_role should be able to invoke terminalization");

console.log("PASS inactive/missing FCM tokens are terminalized without repeated retry attempts");
