import type { Booking } from './supabase';
import { formatINR } from './pricing';

export function generateInvoiceHTML(booking: Booking): string {
  const invoiceNumber = booking.invoice_number ?? booking.booking_number;
  const date = booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-IN') : '';
  const basePrice = booking.base_price ?? 0;
  const gst = booking.gst_amount ?? 0;
  const platformFee = booking.platform_fee ?? 0;
  const discount = booking.discount_amount ?? 0;
  const total = booking.total_amount ?? booking.amount ?? 0;
  const finalAmount = total - discount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 40px 20px; color: #1e293b; }
  .invoice { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 32px; }
  .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .header p { opacity: 0.9; font-size: 14px; }
  .invoice-meta { display: flex; justify-content: space-between; padding: 24px 32px; border-bottom: 1px solid #e2e8f0; }
  .meta-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px; }
  .section { padding: 24px 32px; }
  .section-title { font-size: 14px; font-weight: 700; color: #2563eb; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .detail-label { color: #64748b; }
  .detail-value { font-weight: 600; }
  .items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .items th { text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .items td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
  .items .right { text-align: right; }
  .totals { padding: 24px 32px; background: #f8fafc; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .total-row.grand { font-size: 18px; font-weight: 800; padding-top: 12px; border-top: 2px solid #e2e8f0; margin-top: 8px; }
  .footer { padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
  .otp-info { background: #eff6ff; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; color: #1e40af; }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <h1>VATTAMS</h1>
    <p>Home Services Invoice</p>
  </div>
  <div class="invoice-meta">
    <div>
      <div class="meta-label">Invoice Number</div>
      <div class="meta-value">${invoiceNumber}</div>
    </div>
    <div style="text-align: right;">
      <div class="meta-label">Date</div>
      <div class="meta-value">${date}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Customer Details</div>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${booking.customer_name}</span></div>
    <div class="detail-row"><span class="detail-label">City</span><span class="detail-value">${booking.city}</span></div>
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${booking.service_category}</span></div>
    ${booking.problem_description ? `<div class="detail-row"><span class="detail-label">Problem</span><span class="detail-value">${booking.problem_description}</span></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Service Details</div>
    <table class="items">
      <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Base Service Charge</td><td class="right">${formatINR(basePrice)}</td></tr>
        <tr><td>GST</td><td class="right">${formatINR(gst)}</td></tr>
        <tr><td>Platform Fee</td><td class="right">${formatINR(platformFee)}</td></tr>
        ${discount > 0 ? `<tr><td>Discount (${booking.coupon_code ?? ''})</td><td class="right">-${formatINR(discount)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatINR(basePrice + gst + platformFee)}</span></div>
    ${discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatINR(discount)}</span></div>` : ''}
    <div class="total-row grand"><span>Total Paid</span><span>${formatINR(finalAmount)}</span></div>
  </div>
  ${booking.otp_verification_status ? `
  <div class="section">
    <div class="section-title">Verification</div>
    <div class="otp-info">
      OTP Status: ${booking.otp_verification_status === 'end_verified' ? 'Fully Verified' : booking.otp_verification_status}
      ${booking.job_started_at ? `<br>Start: ${new Date(booking.job_started_at).toLocaleString('en-IN')}` : ''}
      ${booking.job_completed_at ? `<br>End: ${new Date(booking.job_completed_at).toLocaleString('en-IN')}` : ''}
      ${booking.job_duration_minutes ? `<br>Duration: ${booking.job_duration_minutes} minutes` : ''}
    </div>
  </div>` : ''}
  <div class="footer">
    <p>Thank you for choosing VATTAMS Home Services!</p>
    <p>Support: +91 81898 00757 | support@vattams.net</p>
  </div>
</div>
</body>
</html>`;
}

export function downloadInvoice(booking: Booking) {
  const html = generateInvoiceHTML(booking);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VATTAMS-Invoice-${booking.booking_number}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
