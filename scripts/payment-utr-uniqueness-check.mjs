import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const migration = await readFile(new URL('../supabase/migrations/20261104100000_prevent_duplicate_payment_utrs.sql', import.meta.url), 'utf8');
const paymentAuth = await readFile(new URL('../supabase/functions/payment-auth/index.ts', import.meta.url), 'utf8');

assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS payments_utr_normalized_unique/);
assert.match(migration, /lower\(btrim\(utr\)\)/);
assert.match(migration, /WHERE utr IS NOT NULL AND btrim\(utr\) <> ''/);
assert.match(paymentAuth, /error\?\.code === "23505"/);
assert.match(paymentAuth, /UTR has already been submitted/);
process.stdout.write('PASS duplicate UTR database uniqueness contract\n');
