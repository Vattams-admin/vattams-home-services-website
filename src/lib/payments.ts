import QRCode from 'qrcode';
import { supabase } from './supabase';

export const DEFAULT_UPI_ID = 'venkatesan04051985-7@okhdfcbank';
export const PAYEE_NAME = 'VATTAMS HOME SERVICES';

export type PaymentPurpose = 'booking' | 'registration_fee' | 'wallet_recharge' | 'commission';
export type PaymentStatus = 'pending' | 'success' | 'failed';
export type PayeeType = 'customer' | 'technician';

export interface PaymentRecord {
  id: string;
  payment_id: string;
  payment_action_token: string;
  payee_type: PayeeType;
  payee_id: string;
  payee_name: string | null;
  upi_id: string;
  amount: number;
  purpose: PaymentPurpose;
  reference_id: string | null;
  utr: string | null;
  status: PaymentStatus;
  notes: string | null;
  verified_by: string | null;
  created_at: string;
  verified_at: string | null;
}

function parsePaymentRecord(value: unknown): PaymentRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payment = value as Partial<PaymentRecord>;
  if (typeof payment.id !== 'string' || !payment.id.trim() || payment.id.length > 200
    || typeof payment.payment_id !== 'string' || !payment.payment_id.trim() || payment.payment_id.length > 200
    || typeof payment.payment_action_token !== 'string' || !payment.payment_action_token.trim() || payment.payment_action_token.length > 1000
    || typeof payment.payee_id !== 'string' || !payment.payee_id.trim() || payment.payee_id.length > 200
    || typeof payment.upi_id !== 'string' || !payment.upi_id.trim() || payment.upi_id.length > 255
    || (payment.payee_name !== null && payment.payee_name !== undefined && (typeof payment.payee_name !== 'string' || payment.payee_name.length > 200))
    || (payment.reference_id !== null && payment.reference_id !== undefined && (typeof payment.reference_id !== 'string' || payment.reference_id.length > 200))
    || (payment.utr !== null && payment.utr !== undefined && (typeof payment.utr !== 'string' || payment.utr.length > 100))
    || (payment.notes !== null && payment.notes !== undefined && (typeof payment.notes !== 'string' || payment.notes.length > 500))
    || (payment.verified_by !== null && payment.verified_by !== undefined && (typeof payment.verified_by !== 'string' || payment.verified_by.length > 200))
    || !['customer', 'technician'].includes(String(payment.payee_type))
    || !['booking', 'registration_fee', 'wallet_recharge', 'commission'].includes(String(payment.purpose))
    || !['pending', 'success', 'failed'].includes(String(payment.status))
    || typeof payment.amount !== 'number' || !Number.isFinite(payment.amount) || payment.amount <= 0) {
    return null;
  }
  return payment as PaymentRecord;
}

export function buildUpiLink(amount: number, note: string, upiId: string = DEFAULT_UPI_ID): string {
  if (!Number.isFinite(amount) || amount <= 0
    || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    throw new Error('Enter a valid payment amount in rupees and paise.');
  }
  if (typeof upiId !== 'string' || !upiId.trim() || upiId.length > 255) {
    throw new Error('A valid UPI ID is required.');
  }
  if (typeof note !== 'string' || note.length > 200) {
    throw new Error('Payment note must be 200 characters or fewer.');
  }

  const normalizedUpiId = upiId.trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedUpiId)) {
    throw new Error('Enter a valid UPI ID.');
  }

  const params = new URLSearchParams({
    pa: normalizedUpiId,
    pn: PAYEE_NAME,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.trim(),
  });
  return `upi://pay?${params.toString()}`;
}

export async function generateUpiQrCode(amount: number, note: string, upiId: string = DEFAULT_UPI_ID): Promise<string> {
  const link = buildUpiLink(amount, note, upiId);
  return QRCode.toDataURL(link, {
    width: 256,
    margin: 2,
    color: { dark: '#1e3a8a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

export async function createPaymentRecord(params: {
  payee_type: PayeeType;
  payee_id: string;
  payee_name?: string;
  amount: number;
  purpose: PaymentPurpose;
  reference_id?: string;
  notes?: string;
}): Promise<PaymentRecord | null> {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    console.error('Rejected invalid payment record parameters.');
    return null;
  }
  if ((params.payee_name !== undefined && typeof params.payee_name !== 'string')
    || (params.reference_id !== undefined && typeof params.reference_id !== 'string')
    || (params.notes !== undefined && typeof params.notes !== 'string')) {
    console.error('Rejected invalid payment record parameters.');
    return null;
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0
    || Math.abs(params.amount * 100 - Math.round(params.amount * 100)) > 1e-7
    || !['customer', 'technician'].includes(params.payee_type)
    || typeof params.payee_id !== 'string' || !params.payee_id.trim() || params.payee_id.length > 200
    || (params.payee_name !== undefined && (typeof params.payee_name !== 'string' || params.payee_name.length > 200))
    || (params.reference_id !== undefined && (typeof params.reference_id !== 'string' || params.reference_id.length > 200))
    || (params.notes !== undefined && (typeof params.notes !== 'string' || params.notes.length > 500))
    || !['booking', 'registration_fee', 'wallet_recharge', 'commission'].includes(params.purpose)) {
    console.error('Rejected invalid payment record parameters.');
    return null;
  }

  const { data, error } = await supabase.functions.invoke('payment-auth', {
    // Keep the operation authoritative even if an untyped caller supplies an extra `action` field.
    body: { ...params, action: 'create' },
  });

  if (error) {
    console.error('Failed to create payment record:', error);
    return null;
  }
  const payment = parsePaymentRecord(data?.payment);
  if (!payment) console.error('Payment service returned an invalid payment record.');
  return payment;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  utr?: string,
  paymentActionToken?: string,
  verifiedBy?: string,
): Promise<PaymentRecord | null> {
  if (typeof paymentId !== 'string' || !paymentId.trim() || paymentId.length > 200
    || !['pending', 'success', 'failed'].includes(status)
    || (utr !== undefined && (typeof utr !== 'string' || utr.trim().length > 100))
    || (paymentActionToken !== undefined && (typeof paymentActionToken !== 'string' || !paymentActionToken.trim() || paymentActionToken.length > 1000))
    || (verifiedBy !== undefined && (typeof verifiedBy !== 'string' || verifiedBy.length > 200))
    || (status === 'pending' && (typeof utr !== 'string' || !utr.trim() || utr.trim().length > 100
      || typeof paymentActionToken !== 'string' || !paymentActionToken.trim()))
    || (status !== 'pending' && (typeof paymentActionToken !== 'string' || !paymentActionToken.trim()))) {
    console.error('Rejected invalid payment status update parameters.');
    return null;
  }

  const action = status === 'pending' ? 'submit-utr' : 'verify';
  let adminId: string | undefined;
  let adminSessionToken: string | undefined;
  if (status !== 'pending') {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      adminId = sessionStorage.getItem('vattams_admin_id') || undefined;
      adminSessionToken = sessionStorage.getItem('vattams_admin') || undefined;
    } catch {
      return null;
    }
    if (!adminId || !adminSessionToken) return null;
  }

  const { data, error } = await supabase.functions.invoke('payment-auth', {
    body: {
      action,
      payment_id: paymentId,
      payment_action_token: paymentActionToken,
      utr,
      status,
      admin_id: adminId,
      admin_session_token: adminSessionToken,
      verified_by: verifiedBy,
    },
  });

  if (error) {
    console.error('Failed to update payment status:', error);
    return null;
  }
  const payment = parsePaymentRecord(data?.payment);
  if (!payment || payment.payment_id !== paymentId || payment.status !== status) {
    console.error('Payment service returned an invalid or mismatched payment update.');
    return null;
  }
  return payment;
}
