import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261104070000_booking_completion_null_counter_fix.sql", import.meta.url),
  "utf8",
);

assert.match(migration, /total_jobs\s*=\s*COALESCE\(total_jobs,\s*0\)\s*\+\s*1/i,
  "booking completion must increment a nullable total_jobs counter from zero");
assert.match(migration, /INSERT INTO public\.booking_completion_events[\s\S]*?ON CONFLICT \(booking_id\) DO NOTHING[\s\S]*?IF completion_event_booking_id IS NULL THEN[\s\S]*?RETURN NEW;/i,
  "booking completion must retain its once-per-booking idempotency claim");
assert.match(migration, /SET search_path TO 'pg_catalog', 'public', 'pg_temp'/i,
  "security-definer function must keep a pinned search_path");

console.log("PASS booking completion null-counter and idempotency contract");
