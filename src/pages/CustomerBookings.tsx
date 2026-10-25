import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Booking, Customer } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';
import { formatCurrency } from '@/lib/pricing';

const statusLabels: Record<string, string> = {
  pending: 'Awaiting technician assignment',
  confirmed: 'Confirmed',
  assigned: 'Technician assigned',
  accepted: 'Accepted by technician',
  on_the_way: 'Technician on the way',
  in_progress: 'Work in progress',
  job_started: 'Work started',
  job_completed: 'Awaiting completion confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  assigned: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  accepted: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  on_the_way: 'bg-sky-50 text-sky-800 border-sky-200',
  in_progress: 'bg-violet-50 text-violet-800 border-violet-200',
  job_started: 'bg-purple-50 text-purple-800 border-purple-200',
  job_completed: 'bg-teal-50 text-teal-800 border-teal-200',
  completed: 'bg-green-50 text-green-800 border-green-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
};

function formatDate(value?: string | null) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date to be confirmed'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CustomerBookings() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBookings = useCallback(async (customerRecord: Customer, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await customerData<{ bookings: Booking[] }>('bookings', {
        mobile: customerRecord.mobile,
      });
      // customerData returns null when the session is missing or the endpoint
      // rejects the request. Do not turn an unavailable response into a false
      // "No bookings yet" state.
      if (!result || !Array.isArray(result.bookings)) {
        throw new Error('We couldn’t verify your booking history. Please sign in again or retry shortly.');
      }
      setBookings(result.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    const sessionToken = sessionStorage.getItem('vattams_customer_session');
    const expiresAt = sessionStorage.getItem('vattams_customer_expires');
    if (!stored || !sessionToken || !expiresAt) {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
      navigate('customer-login');
      return;
    }
    {
      const expiry = Number(expiresAt);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        sessionStorage.removeItem('vattams_customer');
        sessionStorage.removeItem('vattams_customer_session');
        sessionStorage.removeItem('vattams_customer_expires');
        navigate('customer-login');
        return;
      }
    }
    try {
      const parsed = JSON.parse(stored) as Partial<Customer>;
      if (typeof parsed.id !== 'string' || !parsed.id.trim() ||
          typeof parsed.mobile !== 'string' || !parsed.mobile.trim() ||
          typeof parsed.full_name !== 'string' || !parsed.full_name.trim()) {
        throw new Error('Stored customer profile is incomplete.');
      }
      const record = parsed as Customer;
      setCustomer(record);
      void loadBookings(record);
    } catch {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
      navigate('customer-login');
    }
  }, [loadBookings, navigate]);

  const activeBookings = bookings.filter((booking) =>
    ['pending', 'confirmed', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'job_started', 'job_completed'].includes(booking.status)
  );

  return (
    <div className="min-h-screen bg-[#f7f4ed] px-4 pb-12 pt-24">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('customer-dashboard')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1f3a] hover:underline"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <header className="mb-7 rounded-3xl bg-gradient-to-r from-[#071426] via-[#0b1f3a] to-[#17365b] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#e8c75a]">Customer portal</p>
              <h1 className="text-2xl font-extrabold md:text-3xl">My Bookings</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Track service requests, appointment details and job status in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => customer && void loadBookings(customer, true)}
              disabled={!customer || loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {customer && (
          <p className="mb-5 text-sm text-gray-600">Bookings for <span className="font-semibold text-gray-900">{customer.full_name}</span></p>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-white">
            <Loader2 size={30} className="animate-spin text-[#a47c00]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <AlertCircle size={34} className="mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">Bookings could not be loaded</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              type="button"
              onClick={() => customer && void loadBookings(customer, true)}
              disabled={!customer || refreshing}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Try again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-[#e8e1d2] bg-white p-10 text-center shadow-sm">
            <ClipboardList size={42} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-extrabold text-gray-900">No bookings yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              When you request AC, washing machine or refrigerator service, your booking and status will appear here.
            </p>
            <button
              type="button"
              onClick={() => navigate('booking')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-6 py-3 font-bold text-white hover:bg-[#17365b]"
            >
              Book a service <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#e8e1d2] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total bookings</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0b1f3a]">{bookings.length}</p>
              </div>
              <div className="rounded-2xl border border-[#e8e1d2] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active requests</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0b1f3a]">{activeBookings.length}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-[#e8e1d2] bg-white p-4 md:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Completed</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0b1f3a]">{bookings.filter((b) => b.status === 'completed').length}</p>
              </div>
            </div>

            {bookings.map((booking) => {
              const status = booking.status || 'pending';
              const amount = Number(booking.total_amount ?? booking.amount ?? 0);
              return (
                <article key={booking.id} className="rounded-2xl border border-[#e8e1d2] bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Booking {booking.booking_number}</p>
                      <h2 className="mt-1 text-lg font-extrabold text-[#0b1f3a]">
                        {booking.service_category}{booking.service_type ? ' · ' + booking.service_type : ''}
                      </h2>
                    </div>
                    <span className={'inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ' + (statusClasses[status] ?? 'bg-gray-50 text-gray-700 border-gray-200')}>
                      {statusLabels[status] ?? status.split('_').join(' ')}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="mt-0.5 shrink-0 text-[#a47c00]" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Preferred date</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">{formatDate(booking.preferred_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock size={18} className="mt-0.5 shrink-0 text-[#a47c00]" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Preferred time</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">{booking.preferred_time || 'To be confirmed'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <MapPin size={18} className="mt-0.5 shrink-0 text-[#a47c00]" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Service address</p>
                        <p className="mt-1 text-sm text-gray-700">{booking.address}, {booking.city}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Receipt size={18} className="mt-0.5 shrink-0 text-[#a47c00]" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Customer total</p>
                        <p className="mt-1 text-sm font-extrabold text-gray-900">{formatCurrency(amount)}</p>
                        <p className="mt-1 text-xs text-gray-500">Parts or additional work require your approval.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Wrench size={18} className="mt-0.5 shrink-0 text-[#a47c00]" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Service details</p>
                        <p className="mt-1 text-sm text-gray-700">{booking.problem_description || 'No extra details supplied.'}</p>
                      </div>
                    </div>
                  </div>

                  {status === 'completed' && (
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
                      <CheckCircle2 size={17} /> This service is marked completed.
                    </div>
                  )}
                </article>
              );
            })}

            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={() => navigate('booking')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-6 py-3 font-bold text-white hover:bg-[#17365b]"
              >
                Book another service <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
