import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const migration = await readFile(new URL('../supabase/migrations/20261102170000_enforce_technician_registration_payment_activation.sql', import.meta.url), 'utf8');

assert.match(migration, /AS \$\$[\s\S]*?\n\$\$;/, 'PL/pgSQL function body must use a paired dollar-quote delimiter');
assert.equal((migration.match(/\$\$/g) || []).length, 2, 'migration must contain exactly one paired dollar-quote body');
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_registration_payment_id/, 'registration payment must be unique across technician accounts');
for (const field of ['payment_id = NEW.registration_payment_id', "payee_type = 'technician'", 'payee_id = NEW.mobile', 'amount = 49', "purpose = 'registration_fee'", "NULLIF(btrim(utr), '') IS NOT NULL", "payment_status IS DISTINCT FROM 'success'", "NULLIF(btrim(payment_verified_by), '') IS NULL", 'payment_verified_at IS NULL']) {
  assert.ok(migration.includes(field), `activation guard must verify: ${field}`);
}
assert.match(migration, /BEFORE INSERT OR UPDATE OF status, registration_payment_id, mobile ON public\.technicians/, 'guard must run on activation and changes to payment/mobile linkage');
process.stdout.write('PASS registration-payment migration SQL delimiter, uniqueness, payment proof, and linkage guard contract\n');
