import { useRef, useState } from 'react';
import { customerData } from '@/lib/customerData';
import { buildUpiLink } from '@/lib/payments';
import { formatCurrency } from '@/lib/pricing';

type BookingPayment = {
  status: 'pending' | 'success' | 'failed';
  amount: number;
  upi_id: string;
  utr: string | null;
};

export default function BookingUpiPayment({ bookingId, bookingNumber }: {
  bookingId: string;
  bookingNumber: string;
}) {
  const [payment, setPayment] = useState<BookingPayment | null>(null);
  const [upiLink, setUpiLink] = useState('');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  async function checkout(reference?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await customerData<{ payment?: BookingPayment; error?: string }>(
        'booking_upi_checkout', { booking_id: bookingId, utr: reference },
      );
      if (!result?.payment) {
        setError(result?.error || 'UPI checkout is unavailable. Please try again.');
        return;
      }
      const next = result.payment;
      setUpiLink(next.status === 'pending' && !next.utr
        ? buildUpiLink(next.amount, (bookingNumber || 'VATTAMS booking').slice(0, 200), next.upi_id)
        : '');
      setPayment(next);
    } catch {
      setError('UPI checkout could not be loaded. Please try again.');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  const buttonClass = 'rounded-lg bg-[#0b1f3a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50';

  return (
    <section className="mt-5 space-y-3 rounded-xl border border-[#e8e1d2] bg-[#fffaf0] p-4">
      {!payment ? (
        <button type="button" className={buttonClass} disabled={loading} onClick={() => void checkout()}>
          {loading ? 'Loading…' : 'Open UPI checkout'}
        </button>
      ) : (
        <>
          <p className="font-bold text-[#0b1f3a]">Booking payment · {formatCurrency(payment.amount)}</p>
          {payment.status === 'success' ? <p role="status">Paid</p>
            : payment.status === 'failed' ? <p role="status">Payment could not be verified. Contact support before paying again.</p>
            : payment.utr ? (
              <>
                <p role="status">Verification pending · UTR {payment.utr}</p>
                <button type="button" className={buttonClass} disabled={loading} onClick={() => void checkout()}>Refresh status</button>
              </>
            ) : (
              <>
                <p className="break-all text-sm text-gray-700">UPI ID: {payment.upi_id}</p>
                <a className={buttonClass + ' inline-block'} href={upiLink}>
                  Pay with UPI
                </a>
                <form className="space-y-2" onSubmit={(event) => {
                  event.preventDefault();
                  void checkout(utr.trim().toUpperCase());
                }}>
                  <label className="block text-sm font-semibold" htmlFor={'upi-reference-' + bookingId}>UPI transaction reference (UTR)</label>
                  <input id={'upi-reference-' + bookingId} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    value={utr} onChange={(event) => setUtr(event.target.value)}
                    minLength={6} maxLength={32} pattern="[A-Za-z0-9]{6,32}" required />
                  <button type="submit" className={buttonClass} disabled={loading}>Submit for verification</button>
                </form>
              </>
            )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
