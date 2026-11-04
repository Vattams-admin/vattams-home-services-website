import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const migration = await readFile(new URL('../supabase/migrations/20261104150000_enforce_technician_registration_payment_activation.sql', import.meta.url), 'utf8');

assert.equal((migration.match(/\$\$/g) || []).length, 2, 'function body must have exactly one paired dollar-quote delimiter');
assert.match(migration, /AS \$\$[\s\S]*?\n\$\$;/, 'function body must use paired dollar quoting');
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_registration_payment_id/);
for (const condition of [
  'payment_id = NEW.registration_payment_id',
  "payee_type = 'technician'",
  'payee_id = NEW.mobile',
  'amount = 49',
  "purpose = 'registration_fee'",
  "NULLIF(btrim(utr), '') IS NOT NULL",
  "payment_status IS DISTINCT FROM 'success'",
  "NULLIF(btrim(payment_verified_by), '') IS NULL",
  'payment_verified_at IS NULL'
]) assert.ok(migration.includes(condition), `missing payment verification condition: ${condition}`);
assert.match(migration, /BEFORE INSERT OR UPDATE OF status, registration_payment_id, mobile ON public\.technicians/);
console.log('PASS registration-payment activation migration contract');
