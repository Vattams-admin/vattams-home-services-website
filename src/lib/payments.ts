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

/**
 * Generates a UPI deep link per NPCI spec:
 * upi://pay?pa=<payee>&pn=<name>&am=<amount>&tn=<note>&cu=INR
 */
export function buildUpiLink(amount: number, note: string, upiId: string = DEFAULT_UPI_ID): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: PAYEE_NAME,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a QR code data URL from a UPI link.
 */
export async function generateUpiQrCode(amount: number, note: string, upiId: string = DEFAULT_UPI_ID): Promise<string> {
  const link = buildUpiLink(amount, note, upiId);
  return QRCode.toDataURL(link, {
    width: 256,
    margin: 2,
    color: { dark: '#1e3a8a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Inserts a payment record into the database with status 'pending'.
 * Returns the created record.
 */
export async function createPaymentRecord(params: {
  payee_type: PayeeType;
  payee_id: string;
  payee_name?: string;
  amount: number;
  purpose: PaymentPurpose;
  reference_id?: string;
  notes?: string;
}): Promise<PaymentRecord | null> {
  const { data, error } = await supabase.functions.invoke('payment-auth', {
    body: { action: 'create', ...params },
  });

  if (error) {
    console.error('Failed to create payment record:', error);
    return null;
  }
  return (data?.payment ?? null) as PaymentRecord | null;
}

/**
 * Updates a payment record's status (used after UTR submission or admin verification).
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  utr?: string,
  verifiedBy?: string,
): Promise<PaymentRecord | null> {
  const action = status === 'pending' ? 'submit-utr' : 'verify';
  const adminId =
    status === 'pending'
      ? undefined
      : sessionStorage.getItem('vattams_admin_id') || undefined;
  const adminSessionToken =
    status === 'pending'
      ? undefined
      : sessionStorage.getItem('vattams_admin') || undefined;

  const { data, error } = await supabase.functions.invoke('payment-auth', {
    body: {
      action,
      payment_id: paymentId,
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
  return (data?.payment ?? null) as PaymentRecord | null;
}

/**
 * Fetches payments for a specific payee (by payee_id).
 */
export async function fetchPaymentsByPayee(payeeId: string): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('payee_id', payeeId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as PaymentRecord[];
}

/**
 * Fetches all payments (for admin dashboard).
 */
export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as PaymentRecord[];
}

/**
 * Fetches pending payments (for admin verification queue).
 */
export async function fetchPendingPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as PaymentRecord[];
}
