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
  if (typeof payment.id !== 'string' || !payment.id.trim()
    || typeof payment.payment_id !== 'string' || !payment.payment_id.trim()
    || typeof payment.payment_action_token !== 'string' || !payment.payment_action_token.trim()
    || typeof payment.payee_id !== 'string'
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

  const params = new URLSearchParams({
    pa: upiId.trim(),
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
  if (!Number.isFinite(params.amount) || params.amount <= 0
    || Math.abs(params.amount * 100 - Math.round(params.amount * 100)) > 1e-7
    || !['customer', 'technician'].includes(params.payee_type)
    || !['booking', 'registration_fee', 'wallet_recharge', 'commission'].includes(params.purpose)) {
    console.error('Rejected invalid payment record parameters.');
    return null;
  }

  const { data, error } = await supabase.functions.invoke('payment-auth', {
    body: { action: 'create', ...params },
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
  if (!paymentId.trim() || !['pending', 'success', 'failed'].includes(status)) {
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
  if (!payment) console.error('Payment service returned an invalid payment record.');
  return payment;
}
