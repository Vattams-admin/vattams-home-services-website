import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Star, CheckCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Customer, Booking, Review, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';

export default function CustomerReviews() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadRequestVersion = useRef(0);

  const load = useCallback(async (c: Customer) => {
    const version = ++loadRequestVersion.current;
    setLoading(true);
    try {
      const [bookingResult, reviewResult] = await Promise.all([
        customerData<{ bookings: unknown }>('completed_bookings', { mobile: c.mobile }),
        customerData<{ reviews: unknown }>('reviews', { mobile: c.mobile }),
      ]);
      if (!bookingResult || !Array.isArray(bookingResult.bookings) ||
          !bookingResult.bookings.every((booking) => booking && typeof booking === 'object' &&
            typeof (booking as Booking).id === 'string' && (booking as Booking).id.trim() &&
            typeof (booking as Booking).status === 'string' && (booking as Booking).status.trim()) ||
          !reviewResult || !Array.isArray(reviewResult.reviews) ||
          !reviewResult.reviews.every((review) => review && typeof review === 'object' &&
            typeof (review as Review).id === 'string' && (review as Review).id.trim() &&
            typeof (review as Review).booking_id === 'string' && (review as Review).booking_id.trim() &&
            Number.isInteger((review as Review).rating) && (review as Review).rating >= 1 && (review as Review).rating <= 5 &&
            typeof (review as Review).created_at === 'string' &&
            ((review as Review).review_text === null || typeof (review as Review).review_text === 'string'))) {
        throw new Error('Review information could not be verified. Please retry.');
      }
      const validBookings = bookingResult.bookings as Booking[];
      const validReviews = reviewResult.reviews as Review[];
      if (new Set(validBookings.map((booking) => booking.id.trim())).size !== validBookings.length ||
          new Set(validReviews.map((review) => review.id.trim())).size !== validReviews.length) {
        throw new Error('Review information contained duplicate records. Please retry.');
      }
      if (version !== loadRequestVersion.current) return;
      setBookings(validBookings);
      setReviews(validReviews);
    } catch (err) {
      if (version !== loadRequestVersion.current) return;
      setBookings([]);
      setReviews([]);
      setMessage(err instanceof Error ? err.message : 'Unable to load reviews. Please try again.');
    } finally {
      if (version === loadRequestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const clearSession = () => {
      try {
        sessionStorage.removeItem('vattams_customer');
        sessionStorage.removeItem('vattams_customer_session');
        sessionStorage.removeItem('vattams_customer_expires');
      } catch {
        // Keep authentication failure handling even if storage cleanup is blocked.
      }
    };

    let stored: string | null;
    let sessionToken: string | null;
    let expiresAt: number;
    try {
      stored = sessionStorage.getItem('vattams_customer');
      sessionToken = sessionStorage.getItem('vattams_customer_session');
      expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
    } catch {
      clearSession();
      navigate('customer-login');
      setLoading(false);
      return;
    }

    if (!stored || !sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearSession();
      navigate('customer-login');
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Partial<Customer>;
      if (typeof parsed.id !== 'string' || !parsed.id.trim() ||
          typeof parsed.mobile !== 'string' || !/^[6-9]\d{9}$/.test(parsed.mobile) ||
          typeof parsed.full_name !== 'string' || !parsed.full_name.trim()) {
        throw new Error('Stored customer profile is incomplete.');
      }
      const c = parsed as Customer;
      setCustomer(c);
      void load(c);
    } catch {
      clearSession();
      navigate('customer-login');
      setLoading(false);
    }
    return () => { loadRequestVersion.current += 1; };
  }, [load, navigate]);

  const submitReview = async (booking: Booking) => {
    if (!customer || submitting !== null) return;
    const selectedRating = rating[booking.id] ?? 0;
    if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5) {
      setMessage('Please select a rating from 1 to 5 before submitting.');
      return;
    }

    setSubmitting(booking.id);
    setMessage('');
    try {
      let sessionToken: string | null;
      try {
        sessionToken = sessionStorage.getItem('vattams_customer_session');
      } catch {
        throw new Error('Browser storage is unavailable. Please sign in again before submitting a review.');
      }
      if (!sessionToken) {
        throw new Error('Your session has expired. Please sign in again before submitting a review.');
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_id: customer.id,
          session_token: sessionToken,
          customer_name: customer.full_name,
          technician_id: booking.assigned_technician_id,
          rating: selectedRating,
          review_text: reviewText[booking.id]?.trim().slice(0, 2000) || null,
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : '';
      if (!res.ok || responseError) {
        throw new Error(responseError || 'Unable to confirm review submission. Please try again.');
      }
      setMessage('Thank you. Your review has been submitted.');
      await load(customer);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-ivory-50"><Loader className="animate-spin text-gold-700" size={32} /></div>;
  }

  const reviewedIds = new Set(reviews.map((review) => review.booking_id));
  const pendingReviews = bookings.filter((booking) => !reviewedIds.has(booking.id));

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-navy-950/15 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold-500 text-navy-950 flex items-center justify-center shrink-0"><Star size={22} fill="currentColor" /></div>
            <div>
              <div className="text-gold-400 text-xs font-bold uppercase tracking-[0.18em]">Customer Experience</div>
              <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Your Reviews</h1>
              <p className="text-navy-100 text-sm mt-2">Share your experience after a completed home service.</p>
            </div>
          </div>
        </div>

        {message && <div role="status" aria-live="polite" className="bg-white border border-gold-200 text-navy-800 rounded-2xl p-4 mb-5 text-sm font-medium">{message}</div>}

        {pendingReviews.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-navy-950">Ready for your feedback</h2>
              <span className="text-xs font-semibold text-gold-700">{pendingReviews.length} pending</span>
            </div>
            <div className="space-y-4">
              {pendingReviews.map((booking) => {
                const selected = rating[booking.id] ?? 0;
                return (
                  <div key={booking.id} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-extrabold text-navy-950">{booking.service_category}</div>
                        <div className="text-xs text-gray-500 mt-1">{booking.booking_number} · {new Date(booking.created_at).toLocaleDateString('en-IN')}</div>
                      </div>
                      <CheckCircle size={20} className="text-green-600 shrink-0" />
                    </div>
                    <div className="mt-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Your rating</div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((value) => (
                          <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating((current) => ({ ...current, [booking.id]: value }))} className="p-1 rounded-lg hover:bg-gold-50">
                            <Star size={25} className={value <= selected ? 'text-gold-500' : 'text-gray-300'} fill={value <= selected ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea value={reviewText[booking.id] ?? ''} onChange={(e) => setReviewText((current) => ({ ...current, [booking.id]: e.target.value }))} rows={3} maxLength={2000} placeholder="Tell us about your service experience (optional)" className="w-full mt-4 px-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm resize-none" />
                    <button type="button" disabled={submitting === booking.id} onClick={() => void submitReview(booking)} className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl">
                      {submitting === booking.id ? <Loader size={16} className="animate-spin" /> : <MessageSquare size={16} />} Submit Review
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-extrabold text-navy-950 mb-4">Review history</h2>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gold-200/60 shadow-sm p-10 text-center">
              <Star size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Your submitted reviews will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl border border-gold-200/60 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-navy-950">{bookings.find((booking) => booking.id === review.booking_id)?.service_category ?? 'Completed service'}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map((value) => <Star key={value} size={16} className={value <= review.rating ? 'text-gold-500' : 'text-gray-300'} fill={value <= review.rating ? 'currentColor' : 'none'} />)}</div>
                  </div>
                  {review.review_text && <p className="text-sm text-gray-600 mt-3">{review.review_text}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <button onClick={() => navigate('customer-dashboard')} className="mt-6 w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-navy-700 hover:text-gold-700">
          Back to Dashboard <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
