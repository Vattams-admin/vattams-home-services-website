import { useState, useEffect, useCallback } from 'react';
import { X, Loader, Copy, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import {
  DEFAULT_UPI_ID, PAYEE_NAME,
  generateUpiQrCode, buildUpiLink,
  createPaymentRecord, updatePaymentStatus,
  type PaymentPurpose, type PayeeType,
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  purpose: PaymentPurpose;
  payeeType: PayeeType;
  payeeId: string;
  payeeName?: string;
  referenceId?: string;
  note: string;
  onSuccess?: (paymentId: string) => void;
}

type Step = 'qr' | 'utr' | 'submitting' | 'success' | 'error';

export default function PaymentModal({
  open, onClose, amount, purpose, payeeType, payeeId, payeeName, referenceId, note, onSuccess,
}: PaymentModalProps) {
  const [step, setStep] = useState<Step>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiLink, setUpiLink] = useState<string>('');
  const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);

  const initPayment = useCallback(async () => {
    setLoadingQr(true);
    setErrorMsg('');
    setStep('qr');
    setUtr('');

    const record = await createPaymentRecord({
      payee_type: payeeType,
      payee_id: payeeId,
      payee_name: payeeName,
      amount,
      purpose,
      reference_id: referenceId,
      notes: note,
    });

    if (!record) {
      setErrorMsg('Could not create payment record. Please try again.');
      setStep('error');
      setLoadingQr(false);
      return;
    }

    setPaymentRecordId(record.payment_id);

    try {
      const qr = await generateUpiQrCode(amount, note);
      setQrDataUrl(qr);
      setUpiLink(buildUpiLink(amount, note));
    } catch {
      setErrorMsg('Could not generate QR code.');
      setStep('error');
    }
    setLoadingQr(false);
  }, [amount, note, payeeType, payeeId, payeeName, purpose, referenceId]);

  useEffect(() => {
    if (open) initPayment();
  }, [open, initPayment]);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(DEFAULT_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUpiApp = () => {
    window.open(upiLink, '_blank');
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim() || !paymentRecordId) return;
    setStep('submitting');
    setErrorMsg('');

    const updated = await updatePaymentStatus(paymentRecordId, 'pending', utr.trim());
    if (!updated) {
      setErrorMsg('Could not submit UTR. Please try again.');
      setStep('utr');
      return;
    }

    setStep('success');
    onSuccess?.(paymentRecordId);
  };

  const handleIHavePaid = () => {
    setStep('utr');
  };

  if (!open) return null;

  const purposeLabel: Record<PaymentPurpose, string> = {
    booking: 'Service Booking Payment',
    registration_fee: 'Technician Registration Fee',
    wallet_recharge: 'Wallet Recharge',
    commission: 'Commission Payment',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">{purposeLabel[purpose]}</h2>
            <p className="text-sm text-gray-500">Pay securely via UPI</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Amount */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">Amount to Pay</span>
            <span className="text-2xl font-extrabold text-blue-900">₹{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6">
          {step === 'qr' && (
            <div className="space-y-5">
              {loadingQr ? (
                <div className="flex flex-col items-center py-8">
                  <Loader size={32} className="animate-spin text-blue-600 mb-3" />
                  <p className="text-sm text-gray-500">Generating payment QR...</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-blue-200 rounded-2xl shadow-sm">
                      {qrDataUrl && (
                        <img src={qrDataUrl} alt="UPI QR Code" className="w-56 h-56" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.)
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">UPI ID</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900">{DEFAULT_UPI_ID}</span>
                        <button onClick={handleCopyUpiId} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                          {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Payee</span>
                      <span className="font-semibold text-gray-900">{PAYEE_NAME}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Note</span>
                      <span className="font-medium text-gray-700 text-right max-w-[60%]">{note}</span>
                    </div>
                  </div>

                  <button onClick={handleOpenUpiApp}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                    <Smartphone size={18} /> Open UPI App
                  </button>
                  <button onClick={handleIHavePaid}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                    I've Paid — Enter UTR
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'utr' && (
            <form onSubmit={handleSubmitUtr} className="space-y-5">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Enter Transaction Reference (UTR)</h3>
                <p className="text-sm text-gray-500 mb-4">
                  After making the payment, enter the 12-digit UTR / Reference number from your UPI app.
                  Your payment will be verified by our team.
                </p>
                <input
                  type="text"
                  required
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="e.g. 123456789012"
                  minLength={6}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                Payment ID: <span className="font-mono font-bold">{paymentRecordId}</span>
              </div>

              <button type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Submit Payment Confirmation
              </button>
              <button type="button" onClick={() => setStep('qr')}
                className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium text-sm">
                Back to QR Code
              </button>
            </form>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center py-8">
              <Loader size={32} className="animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-gray-500">Submitting payment confirmation...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Payment Submitted!</h3>
                <p className="text-sm text-gray-500">
                  Your payment of ₹{amount.toFixed(2)} has been recorded with UTR: <span className="font-mono font-semibold">{utr}</span>.
                  It will be verified by our team shortly.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <span className="text-gray-500">Payment ID: </span>
                <span className="font-mono font-bold text-gray-900">{paymentRecordId}</span>
              </div>
              <button onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle size={40} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Payment Error</h3>
                <p className="text-sm text-gray-500">{errorMsg}</p>
              </div>
              <button onClick={initPayment}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: check if a payment is successful for a given reference
export async function checkPaymentSuccess(referenceId: string, purpose: PaymentPurpose): Promise<boolean> {
  const { data } = await supabase
    .from('payments')
    .select('status')
    .eq('reference_id', referenceId)
    .eq('purpose', purpose)
    .eq('status', 'success')
    .limit(1);
  return (data?.length ?? 0) > 0;
}
