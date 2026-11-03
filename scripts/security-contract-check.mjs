import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [paymentAuth, paymentsLib, adminData, customerData, technicianAuth, technicianData, adminDashboard, technicianDashboard, paymentModal, homeFeatures, bookingLifecycleMigration, completionProofMigration, supabaseLib] = await Promise.all([
  read('supabase/functions/payment-auth/index.ts'),
  read('src/lib/payments.ts'),
  read('supabase/functions/admin-data/index.ts'),
  read('supabase/functions/customer-data/index.ts'),
  read('supabase/functions/technician-auth/index.ts'),
  read('supabase/functions/technician-data/index.ts'),
  read('src/pages/AdminDashboard.tsx'),
  read('src/pages/TechnicianDashboard.tsx'),
  read('src/components/PaymentModal.tsx'),
  read('src/components/home/Features.tsx'),
  read('supabase/migrations/20261102193000_booking_job_lock_order.sql'),
  read('supabase/migrations/20261102200000_require_customer_proof_for_completion.sql'),
  read('src/lib/supabase.ts'),
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
  ['KYC upload does not require Content-Length', technicianAuth.includes('if (rawContentLength !== null)')],
  ['KYC multipart body is size-bounded before parsing', technicianAuth.includes('readBoundedUploadBody(req, maxRequestBytes)') && technicianAuth.indexOf('readBoundedUploadBody(req, maxRequestBytes)') < technicianAuth.indexOf('.formData()')],
  ['KYC upload stores into the private technician-docs bucket', technicianAuth.includes('storage.from("technician-docs")')],
  ['registration derives KYC paths from the upload session', technicianAuth.includes('resolveKycPaths(') && technicianAuth.includes('kyc_upload_token')],
  ['technician-data blocks protected actions for inactive accounts', technicianData.includes('sessionTechnician.status!=="active"') && technicianData.includes('Protected actions are unavailable')],
  ['technician job transitions use the atomic RPC', technicianData.includes('transition_technician_job_atomic')],
  ['admin dashboard consumes redacted KYC presence flags', ['has_aadhaar', 'has_pan', 'has_dl'].every((field) => adminDashboard.includes(field)) && !adminDashboard.includes('selectedTech.aadhaar_url')],
  ['admin assignment reports notification delivery failures', adminDashboard.includes('Promise.allSettled') && adminDashboard.includes('assignment saved but notification delivery failed')],
  ['payment modal prevents duplicate in-flight payment creation', paymentModal.includes('inFlightPaymentKeyRef') && paymentModal.includes('paymentKeyRef')],
  ['payment modal ignores stale async payment attempts', paymentModal.includes('paymentAttemptVersionRef')],
  ['homepage does not claim OTP verification is available', homeFeatures.includes('OTP verification is not currently available')],
  ['admin booking cancellation uses the atomic cancellation RPC', adminData.includes('db.rpc("cancel_booking_atomic"')],
  ['admin direct non-cancellation status writes are rejected', adminData.includes('Direct booking status changes are disabled') && !adminData.includes('db.from("bookings").update({status:b.status')],
  ['admin dashboard exposes only eligible cancellation action', adminDashboard.includes('cancellableBookingStatuses.has(selectedBooking.status)') && adminDashboard.includes("updateStatus(selectedBooking.id, 'cancelled')") && !adminDashboard.includes('onClick={() => updateStatus(selectedBooking.id, s)}')],
  ['technician transition locks booking before locking the job', bookingLifecycleMigration.indexOf('FOR UPDATE') > bookingLifecycleMigration.indexOf('FROM public.bookings') && bookingLifecycleMigration.indexOf('FROM public.bookings') < bookingLifecycleMigration.lastIndexOf('FOR UPDATE')],
  ['technician transition revalidates the locked job parent relationship', bookingLifecycleMigration.includes('AND booking_id = v_booking_id')],
  ['technician transition retains service-role-only execute grant', bookingLifecycleMigration.includes('REVOKE ALL ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated') && bookingLifecycleMigration.includes('GRANT EXECUTE ON FUNCTION public.transition_technician_job_atomic(uuid, uuid, text) TO service_role')],
  ['technician cannot finalize booking without customer proof', completionProofMigration.includes("MESSAGE = 'CUSTOMER_COMPLETION_PROOF_REQUIRED'") && !completionProofMigration.includes("p_requested_status IN ('job_started', 'completed')") && technicianData.includes('CUSTOMER_COMPLETION_PROOF_REQUIRED')],
  ['technician-reported completion remains a non-final job_completed state', completionProofMigration.includes("p_requested_status = 'job_completed'") && completionProofMigration.includes("WHEN p_requested_status = 'job_completed' THEN now()")],
  ['wallet transaction type includes recharge dues settlement', supabaseLib.includes("'recharge_dues_settlement'")],
  ['technician dashboard treats recharge dues settlement as a positive payment allocation', technicianDashboard.includes("'recharge_dues_settlement',")],
  ['technician dashboard does not invent a debit or credit direction for adjustment entries', technicianDashboard.includes("const isAdjustment =\\n                  transaction.type === 'adjustment'") && technicianDashboard.includes("{isAdjustment\\n                          ? ''") && !technicianDashboard.includes("'adjustment',\\n                ].includes")],
  ['technician account response includes all wallet fields displayed by dashboard', technicianData.includes('wallet_balance,locked_deposit,available_balance,commission_due,wallet_locked')],
  ['recharge decisions are conditional on pending state and reject stale repeats', adminData.includes('.eq("id",b.recharge_id).eq("status","pending").select("*").maybeSingle()') && adminData.includes('Recharge is no longer pending; refresh the list before taking another action.')],
  ['technician dashboard excludes job_completed from finalized jobs and earnings', technicianDashboard.includes("jobs.filter((job) => job.status === 'completed')") && !technicianDashboard.includes("'completed',\n          'job_completed'")],
  ['technician mark-all-read sends one combined backend request', technicianDashboard.includes("await technicianData('notifications_read_all');") && !technicianDashboard.includes("Promise.all([\n          technicianData('notifications_read_all')")],
  ['technician dashboard labels the in_progress transition as Start Job', technicianDashboard.includes("updateJobStatus(\n                  job,\n                  'job_started'") && technicianDashboard.includes('Start Job')],
  ['technician dashboard follows in_progress → job_started → job_completed', technicianDashboard.includes("job.status ===\n            'in_progress'") && technicianDashboard.includes("updateJobStatus(\n                  job,\n                  'job_started'") && technicianDashboard.includes("job.status ===\n            'job_started'") && technicianDashboard.includes("updateJobStatus(\n                  job,\n                  'job_completed'")],
];

for (const [label, passed] of checks) {
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'}  ${label}\n`);
}
assert.equal(checks.filter(([, passed]) => passed).length, checks.length, 'Security contract checks failed');
process.stdout.write(`\n${checks.length}/${checks.length} security contract checks passed.\n`);
