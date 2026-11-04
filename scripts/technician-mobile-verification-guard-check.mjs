import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const paymentAuth = await readFile(new URL('../supabase/functions/payment-auth/index.ts', import.meta.url), 'utf8');
const createPayment = paymentAuth.slice(paymentAuth.indexOf('async function createPayment'), paymentAuth.indexOf('async function submitUtr'));

assert.match(createPayment, /String\(body\.payee_id \?\? ""\)\.trim\(\)/, 'mobile input must be validated without silently stripping invalid characters');
assert.match(createPayment, /String\(body\.reference_id \?\? ""\)\.trim\(\)/, 'reference input must preserve malformed characters for rejection');
assert.ok(createPayment.includes('if (!/^\\d{10}$/.test(payeeId)'), 'mobile must be exactly ten digits without silently removing characters');
assert.match(createPayment, /referenceId !== payeeId/, 'reference must match the validated mobile exactly');
assert.match(createPayment, /Technician mobile verification is not available yet/, 'registration payment must fail closed without trusted mobile verification');
assert.match(createPayment, /return json\(\{ error: "Technician mobile verification is not available yet[\s\S]*?\}, 503\);/, 'missing phone verification must return 503');
assert.doesNotMatch(createPayment, /\.from\(["']payments["']\)\.insert/, 'registration payment path must not contain a dormant insert while verification is unavailable');
process.stdout.write('PASS strict mobile input validation and fail-closed payment creation\n');
