import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const booking = readFileSync(new URL("../supabase/migrations/20261102154016_idempotent_booking_completion_financial_event.sql", import.meta.url), "utf8");
const recharge = readFileSync(new URL("../supabase/migrations/20261102154512_idempotent_recharge_allocation_ledger.sql", import.meta.url), "utf8");
const counterFix = readFileSync(new URL("../supabase/migrations/20261104070000_booking_completion_null_counter_fix.sql", import.meta.url), "utf8");

assert.match(booking, /CREATE TABLE IF NOT EXISTS public\.booking_completion_events/i);
assert.match(booking, /ON CONFLICT \(booking_id\) DO NOTHING/i);
assert.match(booking, /total_jobs\s*=\s*total_jobs\s*\+\s*1/i,
  "historical mirror must preserve the applied migration body; later fix stays separate");
assert.doesNotMatch(booking, /COALESCE\(total_jobs,\s*0\)\s*\+\s*1/i);

assert.match(recharge, /CREATE TABLE IF NOT EXISTS public\.wallet_recharge_approval_events/i);
assert.match(recharge, /CHECK \(dues_applied \+ wallet_credit = amount\)/i);
assert.match(recharge, /FOR UPDATE/i);
assert.match(recharge, /uq_wallet_transactions_recharge_type/i);

assert.match(counterFix, /COALESCE\(total_jobs,\s*0\)\s*\+\s*1/i,
  "nullable-counter correction must remain a distinct forward migration");

console.log("PASS applied migration-history mirror and forward-fix separation");
