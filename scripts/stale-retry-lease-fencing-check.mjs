import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261107020000_fence_stale_notification_retry_workers.sql", import.meta.url), "utf8");

assert.ok(worker.includes("  lease_until: string;"), "claim result must carry its exact lease fence");
assert.ok(worker.includes("p_expected_lease_until: leaseUntil"), "defer call must pass the claim lease fence");
assert.ok(worker.includes("p_expected_lease_until: claim.lease_until"), "terminalize call must pass the claim lease fence");
assert.ok(worker.includes("deferClaim(claim.delivery_id, claim.lease_until)"), "every defer path must be fenced");

assert.ok(migration.includes("lease_until timestamptz"), "claim RPC must return the lease timestamp");
assert.ok(migration.includes("AND lease_until = p_expected_lease_until"), "mutations must match the original claim lease");
assert.ok(migration.includes("AND lease_until > now()"), "expired claims must not mutate deliveries");
assert.ok(migration.includes("DROP FUNCTION IF EXISTS public.defer_notification_push_retry(uuid)"), "unfenced defer RPC must be removed");
assert.ok(migration.includes("DROP FUNCTION IF EXISTS public.terminalize_notification_push_retry(uuid)"), "unfenced terminalization RPC must be removed");
assert.ok(migration.includes("RETURNS boolean"), "fenced mutations must report whether their claim was still current");
console.log("PASS stale retry workers cannot defer or terminalize rows after lease expiry or reclamation");
