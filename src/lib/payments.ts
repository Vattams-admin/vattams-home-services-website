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
  const { data, error } = await supabase
    .from('payments')
    .insert({
      payee_type: params.payee_type,
      payee_id: params.payee_id,
      payee_name: params.payee_name || null,
      upi_id: DEFAULT_UPI_ID,
      amount: params.amount,
      purpose: params.purpose,
      reference_id: params.reference_id || null,
      status: 'pending',
      notes: params.notes || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create payment record:', error);
    return null;
  }
  return data as PaymentRecord;
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
  const updates: Record<string, unknown> = { status };
  if (utr) updates.utr = utr;
  if (verifiedBy) updates.verified_by = verifiedBy;
  if (status === 'success') updates.verified_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('payment_id', paymentId)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to update payment status:', error);
    return null;
  }
  return data as PaymentRecord;
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
