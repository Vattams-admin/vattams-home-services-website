import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261107120000_fence_push_sender_dispatch_outcomes.sql", import.meta.url), "utf8");
const sender = readFileSync(new URL("../supabase/functions/send-push-notification/index.ts", import.meta.url), "utf8");

assert.ok(migration.includes("dispatch_lease_token uuid"), "migration must add a unique sender lease token");
assert.ok(migration.includes("RETURNS uuid"), "atomic dispatch claim must return its lease token");
assert.ok(migration.includes("dispatch_lease_token = v_claim_token"), "claim must persist the exact token it returns");
assert.ok(migration.includes("RETURN v_claim_token") && migration.includes("RETURN NULL"), "claim must return a token only to the winning sender");

assert.ok(sender.includes("typeof claimed === \"string\" && claimed.length > 0"), "sender must accept only a valid returned claim token");
assert.ok(sender.includes(".eq(\"dispatch_lease_token\", tokenRow.dispatchLeaseToken)"), "sender outcome and release writes must match their own lease token");
assert.ok(sender.includes(".eq(\"dispatch_lease_token\", claimedRow.dispatchLeaseToken)"), "partial claim cleanup must not clear a newer sender's lease");
assert.ok(sender.includes("prior.dispatch_lease_token === tokenRow.dispatchLeaseToken"), "sender must verify ownership before calculating and persisting an outcome");
assert.ok(sender.includes("!persistedOutcome?.length"), "sender must surface a stale or superseded outcome write");
assert.ok(sender.includes("dispatch_lease_token: null"), "successful sender outcome must clear its own lease token");
assert.ok(sender.includes("dispatch_lease_until") && sender.includes("prior.dispatch_lease_until && Date.parse(prior.dispatch_lease_until) > attemptAt.getTime()"),
  "sender must reject outcomes when its matching lease token has expired");
assert.ok(sender.includes('.gt("dispatch_lease_until", attemptAt.toISOString())'),
  "outcome update must atomically require the dispatch lease to remain unexpired");
assert.ok((sender.match(/\.gt\("dispatch_lease_until", new Date\(\)\.toISOString\(\)\)/g) || []).length >= 2,
  "claim cleanup paths must not release or mutate a lease after it expires");


console.log("PASS sender outcomes and cleanup are fenced to the exact dispatch lease token");
