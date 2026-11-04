import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261104200000_fix_recharge_event_credit_variable.sql", import.meta.url), "utf8");
assert.match(migration, /wallet_recharge_approval_events/, "must use durable approval event table");
assert.match(migration, /ON CONFLICT \\(recharge_id\\) DO NOTHING[\\s\\S]*?RETURNING recharge_id INTO claimed_recharge_id/, "must atomically claim recharge once");
assert.match(migration, /IF claimed_recharge_id IS NULL THEN\\s+RETURN NEW;/, "duplicate approval must not repeat financial effects");
assert.match(migration, /dues_applied, wallet_credit, approved_by\\)[\\s\\S]*?dues_settled, v_wallet_credit/, "must persist complete allocation in the claim statement");
assert.match(migration, /v_wallet_credit := NEW.amount - dues_settled/, "must calculate only net wallet credit");
assert.match(migration, /FOR UPDATE/, "must lock technician while allocating");
assert.match(migration, /OLD.status IS DISTINCT FROM 'pending'/, "must only approve pending recharges");
assert.match(migration, /NEW.amount > 100000/, "must enforce the upper amount bound");
assert.doesNotMatch(migration, /wallet_credit = wallet_credit/, "must not self-assign the event credit column");
console.log("PASS recharge approval idempotency and complete allocation contract");
