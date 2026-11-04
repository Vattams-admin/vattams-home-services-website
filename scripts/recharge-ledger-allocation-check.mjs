import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261104170000_reconcile_recharge_ledger_allocation.sql", import.meta.url), "utf8");
assert.match(migration, /'dues_settlement'::text/, "ledger must distinguish dues settlement");
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_recharge_event/, "each recharge event must be unique");
assert.match(migration, /GROUP BY recharge_id, type[\s\S]*?HAVING count\(\*\) > 1[\s\S]*?DUPLICATE_RECHARGE_LEDGER_ROWS_REQUIRE_RECONCILIATION/, "historic duplicate rows must fail safely");
assert.match(migration, /FOR UPDATE/, "technician row must be locked during allocation");
assert.match(migration, /due_settlement := LEAST\(current_due, NEW\.amount\)/, "recharge must allocate dues first");
assert.match(migration, /wallet_credit := GREATEST\(NEW\.amount - due_settlement, 0\)/, "only net remainder becomes wallet credit");
assert.match(migration, /'dues_settlement', due_settlement/, "dues portion must be recorded separately");
assert.match(migration, /'recharge_credit', wallet_credit/, "wallet credit ledger amount must equal net wallet credit");
assert.match(migration, /balance_after, recharge_id/, "ledger rows must retain resulting balance and recharge link");
assert.match(migration, /OLD\.status IS DISTINCT FROM 'approved'/, "approval transition must be explicit");
assert.match(migration, /PERFORM public\.recalc_available_balance/, "available balance must be recalculated");
console.log("PASS recharge ledger allocation contract");
