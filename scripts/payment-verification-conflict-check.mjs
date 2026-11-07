import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../supabase/functions/payment-auth/index.ts', import.meta.url), 'utf8');
const start = source.indexOf('async function verifyPayment');
assert.notEqual(start, -1, 'verifyPayment handler must exist');
const body = source.slice(start);
assert.match(body, /verificationQuery\.select\([^\n]+\)\.maybeSingle\(\)/, 'zero-row updates must be handled as no-result');
assert.match(body, /if \(error\)[\s\S]*?\}, 503\)/, 'database errors must remain 503');
assert.match(body, /if \(!data\) return json\(\{ error: "Payment is no longer pending or could not be updated" \}, 409\)/, 'no matching pending payment must return 409');
assert.doesNotMatch(body, /verificationQuery\.select\([^\n]+\)\.single\(\)/, 'single() must not conflate zero rows with outages');
process.stdout.write('PASS payment verification conflict response contract\n');
