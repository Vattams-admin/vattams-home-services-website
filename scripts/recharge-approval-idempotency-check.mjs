import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261104180000_restore_recharge_approval_event_guard.sql", import.meta.url), "utf8");
assert.match(migration, /wallet_recharge_approval_events/, "must use durable approval event table");
assert.match(migration, /ON CONFLICT \(recharge_id\) DO NOTHING[\s\S]*?RETURNING recharge_id INTO claimed_recharge_id/, "must atomically claim recharge once");
assert.match(migration, /IF claimed_recharge_id IS NULL THEN\s+RETURN NEW;/, "duplicate approval must not repeat financial effects");
assert.match(migration, /'recharge_dues_settlement'/, "must preserve established dues ledger type");
assert.match(migration, /'recharge_credit'/, "must retain net wallet credit ledger type");
assert.match(migration, /dues_applied = due_applied,[\s\S]*?wallet_credit = wallet_credit/, "must persist allocation breakdown on event");
assert.match(migration, /FOR UPDATE/, "must lock technician while allocating");
assert.match(migration, /IF NEW\.status = 'approved' AND OLD\.status IS DISTINCT FROM 'approved'/, "must only process transition into approved");
assert.doesNotMatch(migration, /DROP CONSTRAINT|ADD CONSTRAINT/, "must not replace or narrow the existing ledger type constraint");
console.log("PASS recharge approval idempotency guard contract");
