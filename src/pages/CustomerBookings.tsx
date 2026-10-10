import { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, Calendar, User, Phone, MapPin, Wrench, FileText, Clock, ArrowRight, LogIn, Receipt, LucideIcon, Tag, Briefcase, Sparkles } from 'lucide-react';
import { supabase, ServiceCategory, Customer, ServicePrice } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { notifyCustomer } from '@/lib/notifications';
import { getPricingFromServicePrice, calculatePricing, formatINR, type PricingBreakdown } from '@/lib/pricing';
import { validateCoupon, type Coupon } from '@/lib/coupons';

const bookingCities = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Namakkal',
  'Thanjavur', 'Dindigul', 'Tiruppur', 'Hosur', 'Nagercoil',
  'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Puducherry', 'Villupuram',
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune',
  'Other',
];

const timeSlots = ['07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'];

export default function Booking() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, ServicePrice>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; error?: string; discountAmount: number; coupon?: Coupon } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [success, setSuccess] = useState<{ number: string; id: string } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    customer_name: '', mobile_number: '', city: 'Chennai', address: '',
    service_category: '', problem_description: '', preferred_date: '', preferred_time: '',
  });

  useEffect(() => {
    // Pre-fill from customer session
    const stored = sessionStorage.getItem('vattams_customer');
    if (stored) {
      try {
        const c = JSON.parse(stored) as Customer;
        setCustomer(c);
        setForm((f) => ({
          ...f,
          customer_name: c.full_name,
          mobile_number: c.mobile,
          city: c.city || 'Chennai',
          address: c.address || '',
        }));
      } catch { /* ignore */ }
    }

    Promise.all([
      supabase.from('service_categories').select('*').order('created_at'),
      supabase.from('service_prices').select('*').eq('is_active', true),
    ]).then(([catRes, priceRes]) => {
      if (catRes.data) {
        setServices(catRes.data);
        if (catRes.data[0]) setForm((f) => ({ ...f, service_category: catRes.data[0].name }));
      }
      if (priceRes.data) {
        const map: Record<string, ServicePrice> = {};
        (priceRes.data as ServicePrice[]).forEach((sp) => { map[sp.service_name] = sp; });
        setServicePrices(map);
      }
      setLoading(false);
    });
  }, []);

  const selectedService = services.find((s) => s.name === form.service_category);
  const servicePrice = servicePrices[form.service_category];
  const basePricing: PricingBreakdown | null = servicePrice ? getPricingFromServicePrice(servicePrice) : null;
  const discount = couponResult?.valid ? couponResult.discountAmount : 0;
  const pricing: PricingBreakdown | null = basePricing
    ? calculatePricing(basePricing.basePrice, servicePrice?.gst_rate ?? 18, basePricing.platformFee, servicePrice?.commission_rate ?? 10, discount)
    : null;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !pricing) return;
    setValidatingCoupon(true);
    const result = await validateCoupon(couponCode.trim(), pricing.totalAmount);
    setCouponResult(result);
    setValidatingCoupon(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('booking-ops', {
      body: {
        action: 'create_booking',
        customer_session_token: sessionStorage.getItem('vattams_customer_session') || undefined,
        booking: {customer_name: form.customer_name,
        mobile_number: form.mobile_number,
        city: form.city,
        address: form.address,
        service_category: form.service_category,
        problem_description: form.problem_description,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        amount: pricing?.totalAmount ?? 0,
        base_price: pricing?.basePrice ?? 0,
        gst_amount: pricing?.gstAmount ?? 0,
        platform_fee: pricing?.platformFee ?? 0,
        commission_amount: pricing?.commissionAmount ?? 0,
        total_amount: pricing?.finalAmount ?? pricing?.totalAmount ?? 0,
        coupon_code: couponResult?.valid ? couponResult.coupon?.code ?? null : null,
        discount_amount: couponResult?.valid ? couponResult.discountAmount : 0,
        customer_id: customer?.id || null,
        status: 'pending',}
      }
    }).then((response) => ({
      data: response.data?.data ?? null,
      error: response.error || (!response.data?.data ? new Error('Booking failed') : null),
    }));

    setSubmitting(false);
    if (error) {
      alert('Booking failed. Please try again or call us.');
      return;
    }
    setSuccess({ number: data.booking_number, id: data.id });

    await Promise.all([
      notifyCustomer.bookingReceived(form.mobile_number, data.booking_number, data.id, data.booking_action_token),
    ]);

    // Automatically find and assign the best matching technician (no manual
    // accept needed). If none are eligible, the booking simply stays
    // pending and can still be picked up manually as a fallback.
    void supabase.functions.invoke('booking-ops', {
      body: { action: 'auto_assign', booking_id: data.id, booking_action_token: data.booking_action_token },
    });
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-[#f7f4ed] px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#e8e1d2] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-4">Your service request has been received. Our team will contact you shortly.</p>
          <div className="bg-gold-50 rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Your Booking Number</div>
            <div className="text-xl font-extrabold text-gold-700">{success.number}</div>
          </div>
          <div className="flex flex-col gap-3">
            {customer && (
              <button onClick={() => navigate('customer-bookings')}
                className="flex items-center justify-center gap-2 py-3 bg-[#0b1f3a] hover:bg-[#071426] text-white font-semibold rounded-xl transition-colors">
                View My Bookings
              </button>
            )}
            {!customer && (
              <button onClick={() => navigate('customer-register')}
                className="flex items-center justify-center gap-2 py-3 bg-gold-50 hover:bg-gold-100 text-gold-700 font-semibold rounded-xl transition-colors border border-gold-200">
                <LogIn size={18} /> Create Account to Track
              </button>
            )}
            <button onClick={() => navigate('home')}
              className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
              Back to Home
            </button>
            <button onClick={() => navigate('join-technician')}
              className="flex items-center justify-center gap-2 py-3 bg-[#0b1f3a] hover:bg-[#132d50] text-white font-semibold rounded-xl transition-colors">
              <Briefcase size={16} /> Join as a Technician
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Book a Service</h1>
          <p className="text-[#e8dcc0] max-w-lg mx-auto">
            Fill in the details below and our team will reach out to confirm your booking.
          </p>
        </div>
      </section>

      <section className="py-12 bg-[#f7f4ed]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('vattams:open-chat'))}
            className="w-full flex items-center gap-3 bg-gold-50 hover:bg-gold-100 border border-gold-200 rounded-2xl p-4 mb-5 text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0b1f3a] flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-[#0b1f3a] text-sm">Not sure what you need?</div>
              <div className="text-gold-700 text-xs">Ask our AI Assistant about services, pricing, or how booking works</div>
            </div>
          </button>

          <div className="bg-white rounded-2xl border border-[#e8e1d2] shadow-sm p-6 md:p-8">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader className="animate-spin text-[#0b1f3a]" size={32} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {!customer && (
                  <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 text-sm text-gold-700 flex items-center justify-between">
                    <span>Have an account? Login to pre-fill your details.</span>
                    <button type="button" onClick={() => navigate('customer-login')} className="font-bold hover:underline">Login</button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={User} label="Customer Name *">
                    <input type="text" required value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                      placeholder="Your full name" />
                  </Field>
                  <Field icon={Phone} label="Mobile Number *">
                    <input type="tel" required pattern="[0-9]{10}" value={form.mobile_number}
                      onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                      placeholder="10-digit mobile number" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={MapPin} label="City *">
                    <select required value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all bg-white">
                      {bookingCities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field icon={Wrench} label="Service Category *">
                    <select required value={form.service_category}
                      onChange={(e) => setForm({ ...form, service_category: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all bg-white">
                      {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>

                {selectedService && pricing && (
                  <div className="bg-[#f7f4ed] rounded-xl p-4 border border-[#e8e1d2]">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt size={16} className="text-[#0b1f3a]" />
                      <span className="font-semibold text-gray-800 text-sm">Price Breakdown</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Charge</span>
                        <span className="font-semibold text-gray-800">{formatINR(pricing.basePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST ({servicePrice?.gst_rate ?? 18}%)</span>
                        <span className="font-semibold text-gray-800">{formatINR(pricing.gstAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee</span>
                        <span className="font-semibold text-gray-800">{formatINR(pricing.platformFee)}</span>
                      </div>
                      {couponResult?.valid && couponResult.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({couponResult.coupon?.code})</span>
                          <span className="font-semibold">-{formatINR(couponResult.discountAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-1.5 flex justify-between">
                        <span className="font-bold text-gray-900">Total Amount</span>
                        <span className="font-extrabold text-gold-700 text-lg">{formatINR(pricing.finalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService && pricing && (
                  <div className="bg-[#f7f4ed] rounded-xl p-4 border border-[#e8e1d2]">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={16} className="text-[#0b1f3a]" />
                      <span className="font-semibold text-gray-800 text-sm">Have a Coupon Code?</span>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold-500 uppercase" />
                      <button type="button" onClick={handleValidateCoupon} disabled={validatingCoupon || !couponCode.trim()}
                        className="px-4 py-2 bg-[#0b1f3a] hover:bg-[#071426] disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors">
                        {validatingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponResult?.valid && (
                      <p className="flex items-center gap-1.5 text-xs text-green-600 mt-2 font-semibold">
                        <CheckCircle size={14} aria-hidden="true" /> Coupon applied! You save {formatINR(couponResult.discountAmount)}
                      </p>
                    )}
                    {couponResult && !couponResult.valid && (
                      <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2 font-semibold">
                        <XCircle size={14} aria-hidden="true" /> {couponResult.error}
                      </p>
                    )}
                  </div>
                )}

                <Field icon={MapPin} label="Address *">
                  <textarea required rows={2} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all resize-none"
                    placeholder="Full address with landmark" />
                </Field>

                <Field icon={FileText} label="Problem Description">
                  <textarea rows={3} value={form.problem_description}
                    onChange={(e) => setForm({ ...form, problem_description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all resize-none"
                    placeholder="Describe the issue you're facing..." />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field icon={Calendar} label="Preferred Date">
                    <input type="date" value={form.preferred_date} min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all" />
                  </Field>
                  <Field icon={Clock} label="Preferred Time">
                    <select value={form.preferred_time}
                      onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all bg-white">
                      <option value="">Any time</option>
                      {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#0b1f3a] hover:bg-[#071426] disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#d8c58c]">
                  {submitting ? (
                    <><Loader size={18} className="animate-spin" /> Confirming...</>
                  ) : (
                    <>Confirm Booking <ArrowRight size={16} /></>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400">
                  By booking, you agree to our terms. Payment will be collected after service completion.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}