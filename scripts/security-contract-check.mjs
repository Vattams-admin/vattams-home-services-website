import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [paymentAuth, paymentsLib, adminData, customerData, technicianAuth, technicianData, adminDashboard, paymentModal, homeFeatures] = await Promise.all([
  read('supabase/functions/payment-auth/index.ts'),
  read('src/lib/payments.ts'),
  read('supabase/functions/admin-data/index.ts'),
  read('supabase/functions/customer-data/index.ts'),
  read('supabase/functions/technician-auth/index.ts'),
  read('supabase/functions/technician-data/index.ts'),
  read('src/pages/AdminDashboard.tsx'),
  read('src/components/PaymentModal.tsx'),
  read('src/components/home/Features.tsx'),
]);

const controlCharRegex = String.raw`/[\u0000-\u001f\u007f]/`;

const checks = [
  ['payment-auth avoids wildcard selects', !paymentAuth.includes('.select("*")')],
  ['payment creation explicitly returns the initial capability', paymentAuth.includes('select("id,payment_id,payment_action_token,')],
  ['UTR submission rotates the capability', paymentAuth.includes('payment_action_token: crypto.randomUUID()')],
  ['UTR response uses a safe explicit field list', paymentAuth.includes('.select("id,payment_id,payee_type')],
  ['payment responses disable caching', paymentAuth.includes('"Cache-Control": "no-store"')],
  ['frontend requires capability only on creation', paymentsLib.includes('parsePaymentRecord(data?.payment, true)') && paymentsLib.includes('const payment = parsePaymentRecord(data?.payment);')],
  ['payment inputs reject control characters', (paymentsLib.split(controlCharRegex).length - 1) === 2],
  ['admin payload sanitizer strips payment capabilities', adminData.includes('"payment_action_token"') && adminData.includes('sanitizeSensitiveFields(data)')],
  ['admin payload sanitizer never returns password hashes', adminData.includes('"password_hash"') && adminData.includes('"password_salt"')],
  ['admin payload sanitizer masks payout account numbers', adminData.includes('key === "bank_account_number"') && adminData.includes('digits.slice(-4)')],
  ['customer payload sanitizer strips payment capabilities', customerData.includes('"payment_action_token"') && customerData.includes('sanitizeSensitiveFields(data)')],
  ['KYC upload checks content signatures', technicianAuth.includes('detectKycFile(bytes)')],
  ['KYC upload stores into the private technician-docs bucket', technicianAuth.includes('storage.from("technician-docs")')],
  ['registration derives KYC paths from the upload session', technicianAuth.includes('resolveKycPaths(') && technicianAuth.includes('kyc_upload_token')],
  ['technician-data blocks protected actions for inactive accounts', technicianData.includes('sessionTechnician.status!=="active"') && technicianData.includes('Protected actions are unavailable')],
  ['technician job transitions use the atomic RPC', technicianData.includes('transition_technician_job_atomic')],
  ['admin dashboard consumes redacted KYC presence flags', ['has_aadhaar', 'has_pan', 'has_dl'].every((field) => adminDashboard.includes(field)) && !adminDashboard.includes('selectedTech.aadhaar_url')],
  ['admin assignment reports notification delivery failures', adminDashboard.includes('Promise.allSettled') && adminDashboard.includes('assignment saved but notification delivery failed')],
  ['payment modal prevents duplicate in-flight payment creation', paymentModal.includes('inFlightPaymentKeyRef') && paymentModal.includes('paymentKeyRef')],
  ['payment modal ignores stale async payment attempts', paymentModal.includes('paymentAttemptVersionRef')],
  ['homepage does not claim OTP verification is available', homeFeatures.includes('OTP verification is not currently available')],
];

for (const [label, passed] of checks) {
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'}  ${label}\n`);
}
assert.equal(checks.filter(([, passed]) => passed).length, checks.length, 'Security contract checks failed');
process.stdout.write(`\n${checks.length}/${checks.length} security contract checks passed.\n`);
