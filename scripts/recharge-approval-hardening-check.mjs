import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261104190000_preserve_recharge_approval_hardening.sql", import.meta.url), "utf8");
assert.match(migration, /wallet_recharge_approval_events/, "must use durable approval event table");
assert.match(migration, /ON CONFLICT \(recharge_id\) DO NOTHING[\s\S]*?RETURNING recharge_id INTO claimed_recharge_id/, "must atomically claim recharge once");
assert.match(migration, /IF claimed_recharge_id IS NULL THEN\s+RETURN NEW;/, "duplicate approval must not repeat financial effects");
assert.match(migration, /OLD\.status IS DISTINCT FROM 'pending'/, "must only approve pending recharges");
assert.match(migration, /NEW\.amount > 100000/, "must preserve the ₹100,000 upper bound");
assert.match(migration, /IF NOT FOUND OR settings\.lock_threshold IS NULL/, "must fail closed if wallet settings are missing");
assert.match(migration, /MESSAGE = 'WALLET_SETTINGS_NOT_CONFIGURED'/, "must expose stable settings error");
assert.match(migration, /MESSAGE = 'TECHNICIAN_NOT_FOUND'/, "must fail closed for missing technician");
assert.match(migration, /dues_settled := LEAST\(c_due, NEW\.amount\)/, "must settle only actual dues");
assert.match(migration, /wallet_credit := NEW\.amount - dues_settled/, "must credit only the remainder");
assert.match(migration, /'recharge_dues_settlement'/, "must preserve established dues ledger type");
assert.match(migration, /'recharge_credit'/, "must retain net wallet credit ledger type");
assert.match(migration, /FOR UPDATE/, "must serialize same-technician allocation");
assert.doesNotMatch(migration, /DROP CONSTRAINT|ADD CONSTRAINT/, "must not rewrite ledger type constraints");
console.log("PASS recharge approval hardening + idempotency contract");
