import { useState, useEffect } from 'react';
import { Loader, Star, CheckCircle, Wrench, User } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Booking, Customer } from '@/lib/supabase';

const SUPABASE_URL = 'https://nitlpxztktgjcjxdgiqm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdGxweHp0a3RnamNqeGRnaXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODM5ODcsImV4cCI6MjEwMDc1OTk4N30.mKbYeKEf7u2DjDpPtiVmNasfEx7sH0nwuuNrN_30GiM';

interface ReviewEntry {
  id: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export default function CustomerReviews() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewEntry>>({});
  const [technicians, setTechnicians] = useState<Record<string, { full_name: string; rating: number }>>({});
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try {
      const c = JSON.parse(stored) as Customer;
      setCustomer(c);
      loadBookings(c);
    } catch { navigate('customer-login'); }
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBookings = async (c: Customer) => {
    const { data } = await supabase.from('bookings')
      .select('*').eq('status', 'completed')
      .or(`customer_id.eq.${c.id},mobile_number.eq.${c.mobile}`)
      .order('created_at', { ascending: false });
    const bookingsList = data ?? [];
    setCompletedBookings(bookingsList);

    // Load reviews
    const reviewMap: Record<string, ReviewEntry> = {};
    const techIds = new Set<string>();
    if (bookingsList.length > 0) {
      const { data: revData } = await supabase.from('reviews')
        .select('*').in('booking_id', bookingsList.map((b) => b.id));
      revData?.forEach((r) => { reviewMap[r.booking_id] = r; });
      bookingsList.forEach((b) => { if (b.assigned_technician_id) techIds.add(b.assigned_technician_id); });
    }
    setReviews(reviewMap);

    // Load technicians
    if (techIds.size > 0) {
      const { data: techData } = await supabase.from('technicians')
        .select('id, full_name, rating').in('id', Array.from(techIds));
      const techMap: Record<string, { full_name: string; rating: number }> = {};
      techData?.forEach((t) => { techMap[t.id] = { full_name: t.full_name, rating: t.rating }; });
      setTechnicians(techMap);
    }
    setLoading(false);
  };

  const openReview = (b: Booking) => {
    setReviewing(b);
    setRating(reviews[b.id]?.rating ?? 0);
    setReviewText(reviews[b.id]?.review_text ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewing || !customer) return;
    if (rating < 1 || rating > 5) { showToast('error', 'Please select a rating (1-5 stars).'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          booking_id: reviewing.id,
          customer_id: customer.id,
          customer_name: customer.full_name,
          technician_id: reviewing.assigned_technician_id,
          rating,
          review_text: reviewText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit review');

      showToast('success', 'Review submitted successfully!');
      setReviewing(null);
      setRating(0);
      setReviewText('');
      loadBookings(customer);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to submit review.');
    }
    setSubmitting(false);
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50"><Loader className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Star size={24} className="text-amber-500" /> Reviews &amp; Ratings</h1>

        {toast && (
          <div className={`rounded-xl p-3 text-sm mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.text}</div>
        )}

        {completedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Star size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No completed services to review yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedBookings.map((b) => {
              const review = reviews[b.id];
              const tech = b.assigned_technician_id ? technicians[b.assigned_technician_id] : null;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-blue-700 text-sm">{b.booking_number}</div>
                      <div className="font-extrabold text-gray-900 mt-0.5 flex items-center gap-2"><Wrench size={16} className="text-gray-400" /> {b.service_category}</div>
                    </div>
                    <div className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-IN')}</div>
                  </div>

                  {tech && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <User size={14} className="text-gray-400" /> {tech.full_name}
                      {tech.rating > 0 && <span className="flex items-center gap-0.5"><Star size={12} className="text-amber-500 fill-amber-500" /> {tech.rating}</span>}
                    </div>
                  )}

                  {review ? (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={18} className={s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
                        ))}
                        <span className="ml-2 text-sm font-bold text-gray-700">{review.rating}.0</span>
                      </div>
                      {review.review_text && <p className="text-sm text-gray-600">{review.review_text}</p>}
                      <div className="text-xs text-gray-400 mt-2">Reviewed on {new Date(review.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  ) : (
                    <button onClick={() => openReview(b)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-xl transition-colors">
                      <Star size={18} /> Rate This Service
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setReviewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-lg">Rate Your Experience</h3>
              <p className="text-sm text-gray-500 mt-1">{reviewing.service_category} · {reviewing.booking_number}</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Your Rating</label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110">
                      <Star size={36} className={(hoverRating || rating) >= s ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
                <div className="text-sm font-bold text-gray-600 mt-2">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Review (Optional)</label>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4}
                  placeholder="Tell us about your experience..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none" />
              </div>

              <button type="submit" disabled={submitting || rating === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
                {submitting ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />} Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
