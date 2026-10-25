import { useState, useEffect, useRef } from 'react';
import { Loader, CheckCircle, XCircle, Calendar, User, Phone, MapPin, Wrench, FileText, Clock, ArrowRight, LogIn, Receipt, LucideIcon, Tag, Briefcase, Sparkles } from 'lucide-react';
import { supabase, ServiceCategory, Customer, ServicePrice } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { trackMarketingEvent } from '@/lib/marketingAnalytics';
import { notifyCustomer } from '@/lib/notifications';
import { calculatePricing, formatINR, type PricingBreakdown } from '@/lib/pricing';
import { validateCoupon, type Coupon } from '@/lib/coupons';
import { cities } from '@/lib/cities';

const bookingCities = [...cities.map((c) => c.name), 'Other'];

interface CustomerServicePrice {
  service_category: string;
  service_type: string;
  base_price: number;
  price_label: string;
  is_active: boolean;
}

const getCustomerPriceKey = (category: string, type: string) => `${category}::${type}`;

const customerCategoryOrder = ['AC Service', 'Washing Machine', 'Refrigerator'];
const isCustomerBookingCategory = (name: string) => customerCategoryOrder.includes(name);
const getCustomerCategoryLabel = (name: string) => name === 'AC Service' ? 'Air Conditioner (AC)' : name;


const getServiceTypes = (category: string): string[] => {
  const value = category.trim().toLowerCase();
  if (value.includes('washing machine')) return ['Washing Machine Service'];
  if (value.includes('refrigerator') || value.includes('fridge')) return ['Refrigerator Service'];
  if (/(^|\W)ac(\W|$)|air\s*condition/.test(value)) {
    return ['General Service', 'Installation', 'Gas Filling', 'Pump Water Service', 'Coil Service'];
  }
  return [];
};

const isFeaturedApplianceService = (name: string) => {
  const value = name.trim().toLowerCase();
  return /(^|\W)ac(\W|$)|air\s*condition/.test(value)
    || value.includes('washing machine')
    || value.includes('refrigerator')
    || value.includes('fridge');
};

const timeSlots = ['07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'];

export default function Booking() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, ServicePrice>>({});
  const [customerServicePrices, setCustomerServicePrices] = useState<Record<string, CustomerServicePrice>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [catalogueRetryCount, setCatalogueRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; error?: string; discountAmount: number; coupon?: Coupon } | null>(null);
  const couponValidationRequest = useRef(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [success, setSuccess] = useState<{ number: string; id: string } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    customer_name: '', mobile_number: '', city: 'Chennai', address: '',
    service_category: '', service_type: '', problem_description: '', preferred_date: '', preferred_time: '',
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

    let aiDraft: Record<string, unknown> | null = null;
    try {
      const draft = sessionStorage.getItem('vattams_ai_booking_draft');
      if (draft) aiDraft = JSON.parse(draft) as Record<string, unknown>;
    } catch {
      sessionStorage.removeItem('vattams_ai_booking_draft');
    }

    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all([
      supabase.from('service_categories').select('*').order('created_at'),
      supabase.from('service_prices').select('*').eq('is_active', true),
      supabase.from('customer_service_prices').select('*').eq('is_active', true),
    ]).then(([catRes, priceRes, customerPriceRes]) => {
      if (!active) return;

      // A partial catalogue is unsafe: clear all prior values so a retry failure
      // cannot leave stale prices or categories available for a new booking.
      if (catRes.error || !catRes.data || priceRes.error || !priceRes.data
        || customerPriceRes.error || !customerPriceRes.data) {
        setServices([]);
        setServicePrices({});
        setCustomerServicePrices({});
        setLoadError(catRes.error || !catRes.data
          ? 'Unable to load service categories. Please retry before booking.'
          : 'Unable to load current service prices. Please retry before booking.');
        setLoading(false);
        return;
      }

      let featuredServices: ServiceCategory[] = [];
      if (catRes.data) {
        featuredServices = catRes.data
          .filter((service) => isCustomerBookingCategory(service.name))
          .sort((a, b) => customerCategoryOrder.indexOf(a.name) - customerCategoryOrder.indexOf(b.name));
        setServices(featuredServices);
        if (featuredServices[0]) setForm((f) => ({ ...f, service_category: featuredServices[0].name, service_type: getServiceTypes(featuredServices[0].name)[0] ?? '' }));
      }

      if (aiDraft) {
        const requested = String(aiDraft.service_category ?? '').toLowerCase();
        const mappedCategory = requested.includes('ac')
          ? 'AC Service'
          : requested.includes('washing machine')
            ? 'Washing Machine'
            : requested.includes('refrigerator') || requested.includes('fridge')
              ? 'Refrigerator'
              : '';
        const draftLocation = String(aiDraft.city ?? '').trim();
        const normalizedLocation = draftLocation.toLowerCase();
        const matchedCity = bookingCities.find((city) =>
          normalizedLocation === city.toLowerCase() || normalizedLocation.includes(city.toLowerCase())
        );
        const draftCity = matchedCity ?? (draftLocation && normalizedLocation !== 'other' ? 'Other' : undefined);
        const draftAddress = draftLocation && (!matchedCity || normalizedLocation !== matchedCity.toLowerCase())
          ? draftLocation
          : '';

        if (mappedCategory && featuredServices.some((service) => service.name === mappedCategory)) {
          setForm((f) => ({
            ...f,
            service_category: mappedCategory,
            service_type: getServiceTypes(mappedCategory)[0] ?? '',
            problem_description: String(aiDraft.problem_description ?? f.problem_description),
            city: draftCity ?? f.city,
            address: draftAddress || f.address,
            preferred_time: timeSlots.includes(String(aiDraft.preferred_time ?? '')) ? String(aiDraft.preferred_time) : f.preferred_time,
          }));
        }
        sessionStorage.removeItem('vattams_ai_booking_draft');
      }
      if (priceRes.data) {
        const map: Record<string, ServicePrice> = {};
        (priceRes.data as ServicePrice[]).filter((sp) => isFeaturedApplianceService(sp.service_name)).forEach((sp) => { map[sp.service_name] = sp; });
        setServicePrices(map);
      }
      if (customerPriceRes.data) {
        const map: Record<string, CustomerServicePrice> = {};
        (customerPriceRes.data as CustomerServicePrice[])
          .filter((price) => isFeaturedApplianceService(price.service_category))
          .forEach((price) => { map[getCustomerPriceKey(price.service_category, price.service_type)] = price; });
        setCustomerServicePrices(map);
      }
      if (catRes.error) {
        setLoadError('Unable to load service categories. Please refresh the page or contact support.');
      } else if (priceRes.error || customerPriceRes.error) {
        setLoadError('Unable to load current service prices. Please refresh the page before booking.');
      } else if (!featuredServices.length) {
        setLoadError('No appliance service categories are available right now.');
      }
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      console.error('[Booking] service/pricing load failed:', error);
      setLoadError('Service information could not be loaded. Check your connection and try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [catalogueRetryCount]);

  const selectedService = services.find((s) => s.name === form.service_category);
  const serviceTypes = getServiceTypes(form.service_category);
  const servicePrice = servicePrices[form.service_category];
  const customerServicePrice = customerServicePrices[getCustomerPriceKey(form.service_category, form.service_type)];
  const getCategoryStartingPrice = (category: string): number | null => {
    const prices = getServiceTypes(category)
      .map((type) => customerServicePrices[getCustomerPriceKey(category, type)])
      .filter((price): price is CustomerServicePrice => Boolean(price))
      .map((price) => Number(price.base_price))
      .filter((price) => Number.isFinite(price) && price > 0);
    return prices.length ? Math.min(...prices) : null;
  };
  const discount = couponResult?.valid ? couponResult.discountAmount : 0;
  const customerBasePrice = Number(customerServicePrice?.base_price);
  const gstRate = Number(servicePrice?.gst_rate);
  const platformFee = Number(servicePrice?.platform_fee);
  const commissionRate = Number(servicePrice?.commission_rate);
  const pricingConfigValid = Boolean(servicePrice && customerServicePrice)
    && Number.isFinite(customerBasePrice) && customerBasePrice > 0
    && Number.isFinite(gstRate) && gstRate >= 0 && gstRate <= 100
    && Number.isFinite(platformFee) && platformFee >= 0
    && Number.isFinite(commissionRate) && commissionRate >= 0 && commissionRate <= 100;

  // Keep the preview aligned with booking-ops: invalid configuration should
  // appear unavailable, not silently turn malformed database values into zero.
  const pricing: PricingBreakdown | null = pricingConfigValid
    ? calculatePricing(customerBasePrice, gstRate, platformFee, commissionRate, discount)
    : null;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !pricing || validatingCoupon) return;
    const requestId = ++couponValidationRequest.current;
    const codeToValidate = couponCode.trim();
    const amountToValidate = pricing.totalAmount;
    setValidatingCoupon(true);
    try {
      const result = await validateCoupon(codeToValidate, amountToValidate);
      // Ignore stale responses if the selected service, price, or coupon changed.
      if (requestId === couponValidationRequest.current
        && codeToValidate === couponCode.trim()
        && amountToValidate === pricing?.totalAmount) {
        setCouponResult(result);
      }
    } catch (error) {
      console.error('[Booking] coupon validation failed:', error);
      if (requestId === couponValidationRequest.current) {
        setCouponResult({
          valid: false,
          error: 'We couldn’t verify this coupon right now. Please try again.',
          discountAmount: 0,
        });
      }
    } finally {
      if (requestId === couponValidationRequest.current) setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ignore rapid repeat submissions while a booking request is in flight.
    if (submitting) return;
    setSubmitError('');
    if (!isFeaturedApplianceService(form.service_category)) {
      alert('Please select AC, washing machine, or refrigerator service.');
      return;
    }
    if (!form.service_type || !serviceTypes.includes(form.service_type)) {
      alert('Please select the exact job type.');
      return;
    }
    if (!servicePrice || !customerServicePrice || !pricing) {
      alert('Pricing is not available for this service yet. Please choose another service or contact VATTAMS.');
      return;
    }
    // Do not submit while coupon validation is unresolved: otherwise a fast
    // submit could race the validation response and use a stale coupon state.
    if (validatingCoupon) {
      setSubmitError('Please wait for coupon verification to finish before submitting your booking.');
      return;
    }
    if (couponCode.trim() && !couponResult?.valid) {
      setSubmitError('You entered a coupon code that has not been successfully applied. Apply the coupon again or clear the coupon field before booking.');
      return;
    }
    trackMarketingEvent('booking_request_attempt', { service_category: form.service_category, service_type: form.service_type });
    setSubmitting(true);
    try {
    const { data, error } = await supabase.functions.invoke('booking-ops', {
      body: {
        action: 'create_booking',
        customer_session_token: sessionStorage.getItem('vattams_customer_session') || undefined,
        booking: {customer_name: form.customer_name,
        mobile_number: form.mobile_number,
        city: form.city,
        address: form.address,
        service_category: form.service_category,
        service_type: form.service_type,
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

    // Only show the confirmation screen when the server returns usable booking
    // identifiers. Normalize them once so notifications and assignment use the
    // same values that the customer sees; never invent a booking number locally.
    const bookingId = typeof data?.id === 'string' ? data.id.trim() : '';
    const bookingNumber = typeof data?.booking_number === 'string' ? data.booking_number.trim() : '';
    if (error || !bookingId || !bookingNumber) {
      setSubmitError('We couldn’t confirm that your booking was created. Please check with VATTAMS support before submitting again.');
      return;
    }
    trackMarketingEvent('generate_lead', { service_category: form.service_category, service_type: form.service_type });
    setSuccess({ number: bookingNumber, id: bookingId });

    // Notification delivery must not block technician assignment if the SMS/WhatsApp
    // provider fails or is temporarily unavailable.
    void notifyCustomer.bookingReceived(form.mobile_number, bookingNumber, bookingId, data.booking_action_token)
      .catch((notificationError) => console.error('[Booking] booking-received notification failed:', notificationError));

    // Automatically find and assign the best matching technician (no manual
    // accept needed). If none are eligible, the booking simply stays
    // pending and can still be picked up manually as a fallback.
    void supabase.functions.invoke('booking-ops', {
      body: { action: 'auto_assign', booking_id: bookingId, booking_action_token: data.booking_action_token },
    }).then(({ error: assignmentError }) => {
      if (assignmentError) {
        console.error('[Booking] automatic technician assignment failed:', assignmentError);
      }
    }).catch((assignmentError) => {
      console.error('[Booking] automatic technician assignment failed:', assignmentError);
    });
    } catch (error) {
      console.error('[Booking] submission failed:', error);
      setSubmitError('The booking status could not be confirmed. Please contact VATTAMS support before submitting again, so we can check whether your booking was created.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-ivory px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#e8e1d2] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 aria-live="polite" className="text-2xl font-extrabold text-gray-900 mb-2">Booking Request Received!</h2>
          <p className="text-gray-500 mb-4">Your request is recorded and awaiting technician assignment. Our team will contact you shortly to confirm the appointment.</p>
          <div className="bg-gold-50 rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Your Booking Number</div>
            <div className="text-xl font-extrabold text-gold-700">{success.number}</div>
          </div>
          <div className="flex flex-col gap-3">
            {customer && (
              <button onClick={() => navigate('customer-bookings')}
                className="flex items-center justify-center gap-2 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                View My Bookings
              </button>
            )}
            {!customer && (
              <button onClick={() => navigate('customer-register')}
                className="flex items-center justify-center gap-2 py-3 bg-gold-50 hover:bg-gold-100 text-gold-700 font-semibold rounded-xl transition-colors border border-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                <LogIn size={18} /> Create Account to Track
              </button>
            )}
            <button onClick={() => navigate('home')}
              className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
              Back to Home
            </button>
            <button onClick={() => navigate('join-technician')}
              className="flex items-center justify-center gap-2 py-3 bg-gold-400 hover:bg-gold-300 text-navy-950 text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
              <Briefcase size={16} /> Join as a Technician
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="relative isolate overflow-hidden bg-[#070B15] py-12 text-white sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(212,175,55,.18),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#E7D17D] sm:text-xs">
              <Sparkles size={13} /> Your service, thoughtfully arranged
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Let’s find the right <span className="text-[#DCC15D]">service for your home.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              Share a few details, choose your appliance and review applicable charges before submitting your request.
            </p>
            <div className="mx-auto mt-7 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              {[
                { n: '01', label: 'Your details' },
                { n: '02', label: 'Choose service' },
                { n: '03', label: 'Review request' },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-3 text-left sm:px-4">
                  <span className="block text-[10px] font-bold tracking-[0.16em] text-[#D4AF37]">{step.n}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-white sm:text-sm">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#F1EEE5] to-[#F8F6F0] py-8 sm:py-12">
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
              <div className="font-bold text-navy-900 text-sm">Not sure what you need?</div>
              <div className="text-gold-700 text-xs">Ask our AI Assistant about services, pricing, or how booking works</div>
            </div>
          </button>

          <div className="premium-surface rounded-2xl border bg-white p-5 shadow-xl shadow-slate-900/[0.04] sm:p-7 md:p-9">
            {loadError && (
              <div role="alert" className="mb-5 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                <div className="border-l-4 border-amber-400 bg-amber-50 p-4 sm:p-5">
                  <div className="font-semibold text-[#10182B]">We can’t load the booking catalogue yet</div>
                  <p className="mt-1 text-sm leading-6 text-amber-900">{loadError}</p>
                  <p className="mt-2 text-xs leading-5 text-amber-900/80">Your request has not been submitted. Retry loading the live service catalogue before booking.</p>
                  <button type="button" disabled={loading} onClick={() => { setLoading(true); setCatalogueRetryCount((count) => count + 1); }} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
                    {loading ? 'Retrying…' : 'Retry service catalogue'}
                  </button>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0A132A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#142342]">
                      Retry catalogue
                    </button>
                    <a href="tel:+916374068296" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D4AF37]/45 bg-white px-5 py-3 text-sm font-semibold text-[#10182B] transition hover:bg-[#F8F4E5]">
                      Contact VATTAMS support
                    </a>
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader className="animate-spin text-navy-700" size={32} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && (
                  <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
                    <p className="font-semibold text-rose-950">Booking request not confirmed</p>
                    <p className="mt-1 text-sm leading-6 text-rose-900">{submitError}</p>
                    <a href="tel:+916374068296" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">Contact VATTAMS support</a>
                  </div>
                )}
                {!customer && (
                  <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 text-sm text-gold-700 flex items-center justify-between">
                    <span>Have an account? Login to pre-fill your details.</span>
                    <button type="button" onClick={() => navigate('customer-login')} className="font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Login</button>
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
                    <input type="tel" required inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[0-9]{10}" value={form.mobile_number}
                      onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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
                      onChange={(e) => { couponValidationRequest.current += 1; setValidatingCoupon(false); setForm({ ...form, service_category: e.target.value, service_type: getServiceTypes(e.target.value)[0] ?? '' }); setCouponResult(null); setCouponCode(''); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all bg-white">
                      {services.map((s) => {
                        const startingPrice = getCategoryStartingPrice(s.name);
                        return (
                          <option key={s.id} value={s.name}>
                            {getCustomerCategoryLabel(s.name)}{startingPrice === null ? ' — price unavailable' : ` — from ${formatINR(startingPrice)}`}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                </div>

                <Field icon={Wrench} label="Specific Job Type *">
                  <select required value={form.service_type}
                    onChange={(e) => { couponValidationRequest.current += 1; setValidatingCoupon(false); setForm({ ...form, service_type: e.target.value }); setCouponResult(null); setCouponCode(''); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition-all bg-white">
                    {serviceTypes.map((type) => {
                      const listedPrice = customerServicePrices[getCustomerPriceKey(form.service_category, type)];
                      const listedBasePrice = Number(listedPrice?.base_price);
                      const hasListedPrice = Boolean(listedPrice)
                        && Number.isFinite(listedBasePrice)
                        && listedBasePrice > 0;
                      return <option key={type} value={type}>
                        {type}{hasListedPrice ? ` — ${formatINR(listedBasePrice)}` : ' — price unavailable'}
                      </option>;
                    })}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Choose the specific work needed so we can assign the right technician.</p>
                </Field>

                {selectedService && (!customerServicePrice || !servicePrice) && (
                  <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">Price unavailable for this selection</p>
                    <p className="mt-1">We will not accept a booking until the customer price and tax settings are available. Please choose another job type or contact VATTAMS support.</p>
                  </div>
                )}

                {selectedService && pricing && (
                  <div className="bg-ivory rounded-xl p-4 border border-[#e8e1d2]">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt size={16} className="text-navy-700" />
                      <span className="font-semibold text-gray-800 text-sm">Price Breakdown</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{customerServicePrice?.price_label ?? 'Starting service price'}</span>
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
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      This is the starting service price for the selected job. Any spare parts, materials, or model-specific extra work will be quoted separately and requires your approval before work begins.
                    </p>
                  </div>
                )}

                {selectedService && pricing && (
                  <div className="bg-ivory rounded-xl p-4 border border-[#e8e1d2]">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={16} className="text-navy-700" />
                      <span className="font-semibold text-gray-800 text-sm">Have a Coupon Code?</span>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={couponCode} disabled={validatingCoupon || submitting} onChange={(e) => { couponValidationRequest.current += 1; setValidatingCoupon(false); setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold-500 uppercase" />
                      <button type="button" onClick={handleValidateCoupon} disabled={validatingCoupon || submitting || !couponCode.trim()}
                        className="px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                        {validatingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponResult?.valid && (
                      <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-green-600 mt-2 font-semibold">
                        <CheckCircle size={14} aria-hidden="true" /> Coupon applied! You save {formatINR(couponResult.discountAmount)}
                      </p>
                    )}
                    {couponResult && !couponResult.valid && (
                      <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-red-600 mt-2 font-semibold">
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

                <button type="submit" disabled={submitting || !servicePrice || !customerServicePrice || !pricing}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-navy-900 hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#d8c58c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
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