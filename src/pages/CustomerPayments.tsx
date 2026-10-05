import { useState, useEffect } from 'react';
import { Loader, CreditCard, Download, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Customer } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';
import { fetchPaymentsByPayee, PaymentRecord } from '@/lib/payments';

interface BookingRef { service_category: string; booking_number: string; }

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  success: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Success' },
  pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
  failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Failed' },
};

const purposeLabels: Record<string, string> = {
  booking: 'Service Booking',
  registration_fee: 'Registration Fee',
  wallet_recharge: 'Wallet Recharge',
  commission: 'Commission',
};

export default function CustomerPayments() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bookings, setBookings] = useState<Record<string, BookingRef>>({});
  const [loading, setLoading] = useState(true);
  const [invoicePayment, setInvoicePayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try {
      const c = JSON.parse(stored) as Customer;
      setCustomer(c);
      Promise.all([loadPayments(c), loadBookings(c)]).finally(() => setLoading(false));
    } catch { navigate('customer-login'); }
  }, []);

  const loadPayments = async (c: Customer) => {
    const data = await customerData<{ payments: PaymentRecord[] }>('payments', { mobile: c.mobile });
    setPayments(data?.payments ?? []);
  };

  const loadBookings = async (c: Customer) => {
    const result = await customerData<{ bookings: { id: string; service_category: string; booking_number: string }[] }>('booking_refs', { mobile: c.mobile });
    const map: Record<string, BookingRef> = {};
    result?.bookings.forEach((b) => { map[b.id] = { service_category: b.service_category, booking_number: b.booking_number }; });
    setBookings(map);
  };

  const downloadInvoice = (payment: PaymentRecord) => {
    const booking = payment.reference_id ? bookings[payment.reference_id] : null;
    const invoiceContent = generateInvoiceHTML(payment, booking, customer);
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${payment.payment_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-ivory-50"><Loader className="animate-spin text-gold-700" size={32} /></div>;
  }

  const totalPaid = payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><CreditCard size={24} className="text-gold-700" /> Payment History</h1>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3"><CheckCircle size={18} className="text-green-600" /></div>
            <div className="text-2xl font-extrabold text-gray-900">₹{totalPaid.toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-400 font-medium">Total Paid</div>
          </div>
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3"><Clock size={18} className="text-amber-600" /></div>
            <div className="text-2xl font-extrabold text-gray-900">₹{totalPending.toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-400 font-medium">Pending Verification</div>
          </div>
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3"><CreditCard size={18} className="text-gold-700" /></div>
            <div className="text-2xl font-extrabold text-gray-900">{payments.length}</div>
            <div className="text-xs text-gray-400 font-medium">Total Transactions</div>
          </div>
        </div>

        {/* Payment List */}
        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-12 text-center">
            <CreditCard size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payment transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const cfg = statusConfig[p.status] ?? statusConfig.pending;
              const booking = p.reference_id ? bookings[p.reference_id] : null;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-blue-700 text-sm">{p.payment_id}</div>
                      <div className="font-extrabold text-gray-900 mt-0.5">{purposeLabels[p.purpose] ?? p.purpose}</div>
                      {booking && <div className="text-xs text-gray-400 mt-0.5">{booking.service_category} · {booking.booking_number}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-gray-900">₹{p.amount.toLocaleString('en-IN')}</div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        <cfg.icon size={12} /> {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                      {p.utr && <span className="font-mono text-xs">UTR: {p.utr}</span>}
                      <span className="text-xs">UPI: {p.upi_id}</span>
                    </div>
                    {p.status === 'success' && (
                      <button onClick={() => downloadInvoice(p)} className="flex items-center gap-1 text-gold-700 font-semibold hover:underline">
                        <Download size={14} /> Invoice
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function generateInvoiceHTML(payment: PaymentRecord, booking: BookingRef | null, customer: Customer | null): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${payment.payment_id}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
  .subtitle { font-size: 12px; color: #d97706; letter-spacing: 2px; text-transform: uppercase; }
  .invoice-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .label { color: #666; font-size: 14px; }
  .value { font-weight: bold; font-size: 14px; }
  .total { background: #f0f7ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
  .total .value { font-size: 20px; color: #1e3a8a; }
  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .status-success { background: #dcfce7; color: #166534; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">VATTAMS</div>
    <div class="subtitle">Home Services</div>
  </div>
  <div class="invoice-title">Payment Invoice</div>
  <div class="row"><span class="label">Invoice Number</span><span class="value">${payment.payment_id}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${new Date(payment.created_at).toLocaleDateString('en-IN')}</span></div>
  <div class="row"><span class="label">Customer Name</span><span class="value">${customer?.full_name ?? payment.payee_name ?? 'N/A'}</span></div>
  <div class="row"><span class="label">Mobile Number</span><span class="value">${payment.payee_id}</span></div>
  ${booking ? `<div class="row"><span class="label">Service</span><span class="value">${booking.service_category}</span></div><div class="row"><span class="label">Booking Number</span><span class="value">${booking.booking_number}</span></div>` : ''}
  <div class="row"><span class="label">Payment Purpose</span><span class="value">${purposeLabels[payment.purpose] ?? payment.purpose}</span></div>
  <div class="row"><span class="label">UPI ID</span><span class="value">${payment.upi_id}</span></div>
  ${payment.utr ? `<div class="row"><span class="label">UTR Number</span><span class="value">${payment.utr}</span></div>` : ''}
  <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-success">Paid</span></span></div>
  <div class="total"><div class="row" style="border:none"><span class="label" style="font-size:16px">Total Amount</span><span class="value">₹${payment.amount.toLocaleString('en-IN')}</span></div></div>
  <div class="footer">This is a computer-generated invoice from VATTAMS Home Services.<br>For queries, call +91 81898 00757 or WhatsApp us.</div>
</body>
</html>`;
}
