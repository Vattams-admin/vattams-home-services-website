import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const paymentAuth = await readFile(new URL('../supabase/functions/payment-auth/index.ts', import.meta.url), 'utf8');
const createPayment = paymentAuth.slice(paymentAuth.indexOf('async function createPayment'), paymentAuth.indexOf('async function submitUtr'));
const guard = createPayment.indexOf('Technician mobile verification is not available yet');
const insert = createPayment.indexOf('.from("payments").insert');

assert.notEqual(guard, -1, 'registration payment must fail closed without trusted mobile verification');
assert.notEqual(insert, -1, 'payment creation path must remain covered');
assert.ok(guard < insert, 'mobile ownership guard must execute before any payment insert');
assert.match(createPayment, /email OTP and the KYC upload capability do not prove control of this mobile/i);
process.stdout.write('PASS technician registration payment fails closed before database insert without phone ownership proof\n');
