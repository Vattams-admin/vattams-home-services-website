import { useState, useEffect, useRef } from 'react';
import { Loader, Briefcase, Calendar, Clock, MapPin, Wrench, CheckCircle, X, ChevronRight, Bell, TrendingUp, CreditCard, Star, Phone, User } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Booking, Customer } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';
import { formatCurrency } from '@/lib/pricing';
import CommunicationCenter from '@/components/CommunicationCenter';
import PushNotificationSetup from '@/components/PushNotificationSetup';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  assigned: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  accepted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  on_the_way: 'bg-sky-100 text-sky-700 border-sky-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  job_started: 'bg-violet-100 text-violet-700 border-violet-200',
  job_completed: 'bg-teal-100 text-teal-700 border-teal-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  pending: 'Awaiting assignment',
  confirmed: 'Confirmed',
  assigned: 'Technician assigned',
  accepted: 'Accepted',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  job_started: 'Work started',
  job_completed: 'Awaiting completion confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatNotificationDate(value: string): string {
  if (typeof value !== 'string' || !value.trim()) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Date unavailable';
  }
}

function notificationText(value: string): string {
  const normalized = value.trim();
  return normalized || 'No message provided.';
}

function getBookingProgressIndex(status: string): number {
  if (status === 'pending') return 0;
  if (['confirmed', 'assigned', 'accepted', 'on_the_way'].includes(status)) return 1;
  if (['in_progress', 'job_started', 'job_completed'].includes(status)) return 2;
  if (status === 'completed') return 3;
  return -1;
}

function getBookingProgressLabel(status: string): string {
  if (status === 'cancelled') return 'This booking was cancelled.';
  if (getBookingProgressIndex(status) < 0) return 'Progress unavailable for this booking status.';
  if (status === 'completed') return 'Service completed.';
  if (status === 'job_completed') return 'Work reported complete; awaiting confirmation.';
  if (status === 'in_progress' || status === 'job_started') return 'Your service is in progress.';
  if (status === 'on_the_way') return 'Your technician is on the way.';
  if (status === 'accepted') return 'Your technician has accepted the booking.';
  if (status === 'assigned') return 'A technician has been assigned.';
  if (status === 'confirmed') return 'Your booking is confirmed.';
  return 'Your booking is awaiting assignment.';
}

const statusSteps = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function CustomerDashboard() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; created_at: string; is_read: boolean }[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const dialogCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogCloseButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelected(null);
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogCloseButtonRef.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogCloseButtonRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [selected]);

  const refreshDashboard = async (c: Customer) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    const results = await Promise.allSettled([loadBookings(c), loadNotifications(c)]);
    if (version !== requestVersion.current) return;

    const bookingResult = results[0];
    const notificationResult = results[1];
    if (bookingResult.status === 'fulfilled') {
      setBookings(bookingResult.value);
      setBookingsLoaded(true);
    } else {
      setBookingsLoaded(false);
      console.error('[CustomerDashboard] booking history load failed:', bookingResult.reason);
    }
    if (notificationResult.status === 'fulfilled') {
      setNotifications(notificationResult.value);
      setNotificationsLoaded(true);
    } else {
      setNotificationsLoaded(false);
      console.error('[CustomerDashboard] notification load failed:', notificationResult.reason);
    }

    if (bookingResult.status === 'rejected') setLoadError('Your booking history could not be verified. Please retry.');
    else if (notificationResult.status === 'rejected') setLoadError('Some dashboard information could not be loaded. Please retry.');
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const stored = sessionStorage.getItem('vattams_customer');
    const sessionToken = sessionStorage.getItem('vattams_customer_session');
    const expiresAt = sessionStorage.getItem('vattams_customer_expires');

    const clearCustomerSession = () => {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
    };

    if (!stored || !sessionToken || !expiresAt) {
      clearCustomerSession();
      navigate('customer-login');
      return () => {
        active = false;
        requestVersion.current += 1;
      };
    }

    const expiry = Number(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      clearCustomerSession();
      navigate('customer-login');
      return () => {
        active = false;
        requestVersion.current += 1;
      };
    }

    try {
      const parsed = JSON.parse(stored) as Partial<Customer>;
      if (typeof parsed.id !== 'string' || !parsed.id.trim() ||
          typeof parsed.mobile !== 'string' || !parsed.mobile.trim() ||
          typeof parsed.full_name !== 'string' || !parsed.full_name.trim()) {
        throw new Error('Stored customer profile is incomplete.');
      }
      const c = parsed as Customer;
      if (active) {
        setCustomer(c);
        void refreshDashboard(c);
      }
    } catch {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
      navigate('customer-login');
    }

    return () => {
      active = false;
      // Invalidate in-flight refreshes on unmount so they cannot update stale state.
      requestVersion.current += 1;
    };
  }, []);

  const loadBookings = async (c: Customer): Promise<Booking[]> => {
    const data = await customerData<{ bookings: unknown }>('bookings', { mobile: c.mobile });
    if (!data || !Array.isArray(data.bookings)) {
      throw new Error('Booking history response was unavailable or invalid.');
    }
    const validBookings = data.bookings.filter((item): item is Booking => {
      if (!item || typeof item !== 'object') return false;
      const booking = item as Partial<Booking>;
      return typeof booking.id === 'string' && booking.id.trim().length > 0 &&
        typeof booking.status === 'string' && booking.status.trim().length > 0;
    });
    if (validBookings.length !== data.bookings.length) {
      throw new Error('Booking history contained incomplete records. Please retry.');
    }
    const bookingIds = validBookings.map((booking) => booking.id.trim());
    if (new Set(bookingIds).size !== bookingIds.length) {
      throw new Error('Booking history contained duplicate records. Please retry.');
    }
    return validBookings;
  };

  const loadNotifications = async (c: Customer): Promise<{ id: string; title: string; message: string; created_at: string; is_read: boolean }[]> => {
    const data = await customerData<{ notifications: unknown }>('account', { mobile: c.mobile });
    if (!data || !Array.isArray(data.notifications)) {
      throw new Error('Notification response was unavailable or invalid.');
    }
    const validNotifications = data.notifications.filter((item): item is { id: string; title: string; message: string; created_at: string; is_read: boolean } => {
      if (!item || typeof item !== 'object') return false;
      const notification = item as Record<string, unknown>;
      return typeof notification.id === 'string' && notification.id.trim().length > 0 &&
        typeof notification.title === 'string' &&
        typeof notification.message === 'string' &&
        typeof notification.is_read === 'boolean' &&
        typeof notification.created_at === 'string';
    });
    if (validNotifications.length !== data.notifications.length) {
      throw new Error('Notifications contained incomplete records. Please retry.');
    }
    return validNotifications;
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-ivory-50"><Loader className="animate-spin text-gold-700" size={32} /></div>;
  }

  const activeBookings = bookings.filter((b) => ['pending', 'confirmed', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'job_started', 'job_completed'].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const upcomingBooking = activeBookings.find((b) => b.preferred_date) ?? activeBookings[0];
  const unreadCount = notifications.filter((n) => n.is_read === false).length;

  const quickLinks = [
    { label: 'My Bookings', icon: Briefcase, page: 'customer-bookings' as const, color: 'bg-blue-100 text-gold-700' },
    { label: 'Payments', icon: CreditCard, page: 'customer-payments' as const, color: 'bg-green-100 text-green-600' },
    { label: 'Reviews', icon: Star, page: 'customer-reviews' as const, color: 'bg-amber-100 text-amber-600' },
    { label: 'Profile', icon: User, page: 'customer-profile' as const, color: 'bg-navy-100 text-navy-700' },
    { label: 'Support', icon: Phone, page: 'customer-support' as const, color: 'bg-red-100 text-red-600' },
    { label: 'Book New', icon: Wrench, page: 'booking' as const, color: 'bg-navy-100 text-navy-700' },
    { label: 'Join as Tech', icon: Briefcase, page: 'join-technician' as const, color: 'bg-gold-100 text-gold-700' },
  ];

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-6 md:p-8 mb-6 text-white shadow-xl shadow-navy-950/15">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Welcome back, {customer.full_name.split(' ')[0]}!</h1>
              <p className="text-navy-100 text-sm mt-1">Here's your service overview</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('booking')} className="px-5 py-2.5 bg-gold-500 text-navy-950 font-bold text-sm rounded-xl hover:bg-gold-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950">
                Book a Service
              </button>
            </div>
          </div>
        </div>

        {loadError && (
          <div role="alert" aria-live="assertive" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void refreshDashboard(customer)}
              disabled={loading}
              className="rounded-lg border border-amber-300 px-3 py-2 font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              {loading ? 'Refreshing…' : 'Retry'}
            </button>
          </div>
        )}

        <PushNotificationSetup userType="customer" userId={customer.mobile} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Briefcase} label="Active Bookings" value={bookingsLoaded ? String(activeBookings.length) : '—'} color="bg-blue-100 text-gold-700" />
          <StatCard icon={CheckCircle} label="Completed" value={bookingsLoaded ? String(completedBookings.length) : '—'} color="bg-green-100 text-green-600" />
          <StatCard icon={TrendingUp} label="Total Bookings" value={bookingsLoaded ? String(bookings.length) : '—'} color="bg-navy-100 text-navy-700" />
          <StatCard icon={Bell} label="Notifications" value={notificationsLoaded ? String(unreadCount) : '—'} color="bg-amber-100 text-amber-600" />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {quickLinks.map((q) => (
            <button key={q.label} onClick={() => navigate(q.page)}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gold-300 transition-all">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${q.color}`}><q.icon size={18} /></div>
              <span className="text-xs font-semibold text-gray-700">{q.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Bookings */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-900">Active Bookings</h2>
              <button onClick={() => navigate('customer-bookings')} className="text-sm text-gold-700 font-semibold hover:underline">View All</button>
            </div>
            {!bookingsLoaded ? (
              <div role="status" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <Loader className="animate-spin text-gold-700 mx-auto mb-2" size={24} />
                <p className="text-gray-500 text-sm">Loading your active bookings…</p>
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <Briefcase size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-700 text-sm font-semibold">No active bookings right now.</p>
                <p className="text-gray-500 text-xs mt-1">Ready when you are—book a service to get started.</p>
                <button type="button" onClick={() => navigate('booking')} className="mt-4 rounded-xl bg-navy-950 px-4 py-2 text-sm font-bold text-white hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">Book a Service</button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.slice(0, 3).map((b) => {
                  const stepIndex = getBookingProgressIndex(b.status);
                  return (
                    <div
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`View booking ${typeof b.booking_number === 'string' && b.booking_number.trim() ? b.booking_number : 'reference unavailable'}, ${statusLabels[b.status] ?? (typeof b.status === 'string' ? b.status.replace(/_/g, ' ') : 'status unavailable')}`}
                      onClick={() => setSelected(b)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(b);
                        }
                      }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold text-blue-700 text-xs">{typeof b.booking_number === 'string' && b.booking_number.trim() ? b.booking_number : "Booking reference unavailable"}</div>
                          <div className="font-extrabold text-gray-900 mt-0.5">{typeof b.service_category === 'string' && b.service_category.trim() ? b.service_category : "Home service"}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[b.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {statusLabels[b.status] ?? (typeof b.status === 'string' ? b.status.replace(/_/g, ' ') : 'Status unavailable')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /> {b.city || "Location to be confirmed"}</div>
                        <div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {b.preferred_date || "Date to be confirmed"}</div>
                        <div className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> {b.preferred_time || "Time to be confirmed"}</div>
                        {(() => {
                          const rawAmount = b.total_amount ?? b.amount;
                          const parsedAmount = rawAmount == null || rawAmount === '' ? null : Number(rawAmount);
                          const amount = parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : null;
                          return amount === null
                            ? <div className="text-xs text-gray-500">Price confirmation pending</div>
                            : <div className="font-bold text-gray-900">{formatCurrency(amount)}</div>;
                        })()}
                      </div>
                      {stepIndex < 0 ? (
                        <p className="mt-2 text-xs text-gray-500" role="status">{getBookingProgressLabel(b.status)}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            {statusSteps.map((s, i) => (
                          <div key={s} className="flex items-center flex-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                            </div>
                            {i < statusSteps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${i < stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                          </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-500" role="status">{getBookingProgressLabel(b.status)}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booking History */}
            <div className="flex items-center justify-between mb-4 mt-6">
              <h2 className="text-lg font-extrabold text-gray-900">Recent History</h2>
            </div>
            {!bookingsLoaded ? (
              <div role="status" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center text-sm text-gray-500">Loading booking history…</div>
            ) : completedBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-gray-700 text-sm font-semibold">No completed bookings yet.</p>
                <p className="text-gray-500 text-xs mt-1">Completed services will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedBookings.slice(0, 3).map((b) => (
                  <div key={b.id} role="button" tabIndex={0}
                    aria-label={`View completed booking ${typeof b.booking_number === 'string' && b.booking_number.trim() ? b.booking_number : 'reference unavailable'}`}
                    onClick={() => setSelected(b)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(b);
                      }
                    }}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-shadow cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{b.service_category || "Home service"}</div>
                      <div className="text-xs text-gray-400">{b.booking_number || "Booking reference unavailable"} · {formatNotificationDate(b.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {b.amount != null && Number.isFinite(Number(b.amount)) && <span className="font-bold text-gray-900 text-sm">{formatCurrency(Number(b.amount))}</span>}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Completed</span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming + Notifications */}
          <div className="space-y-6">
            {/* Upcoming Service */}
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Upcoming Service</h2>
              {upcomingBooking ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Wrench size={18} className="text-gold-700" /></div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{upcomingBooking.service_category || "Home service"}</div>
                      <div className="text-xs text-gray-400">{upcomingBooking.booking_number || "Booking reference unavailable"}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> {upcomingBooking.preferred_date || "Date to be confirmed"}</div>
                    <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {upcomingBooking.preferred_time || "Time to be confirmed"}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {upcomingBooking.city || "Location to be confirmed"}</div>
                  </div>
                  <div className={`mt-3 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border inline-block ${statusColors[upcomingBooking.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {statusLabels[upcomingBooking.status] ?? upcomingBooking.status.replace(/_/g, ' ')}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No upcoming services.</p>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Notifications</h2>
              {!notificationsLoaded ? (
                <div role="status" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center text-sm text-gray-500">Loading notifications…</div>
              ) : notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">You’re all caught up.</p>
                  <p className="mt-1 text-xs text-gray-400">Updates about your bookings will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <article key={n.id} aria-label={n.is_read === false ? `Unread notification: ${n.title}` : `Notification: ${n.title}`} className={`bg-white rounded-xl border shadow-sm p-3 ${n.is_read === false ? 'border-gold-200 bg-gold-50/30' : 'border-gray-100'}`}>
                      <div className="flex items-start gap-2">
                        <div aria-hidden="true" className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read === false ? 'bg-gold-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{notificationText(n.title)}</div>
                          <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap break-words">{notificationText(n.message)}</div>
                          <div className="text-xs text-gray-400 mt-1">{formatNotificationDate(n.created_at)}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-booking-dialog-title"
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">

              <div>
                <h3 id="customer-booking-dialog-title" className="font-extrabold text-gray-900 text-lg">Booking Details</h3>
                <p className="text-gold-700 font-bold text-sm">{typeof selected.booking_number === 'string' && selected.booking_number.trim() ? selected.booking_number : 'Booking reference unavailable'}</p>
              </div>
              <button ref={dialogCloseButtonRef} type="button" aria-label="Close booking details" onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={User} label="Customer" value={selected.customer_name || 'Not provided'} />
                <InfoRow icon={Wrench} label="Service" value={[selected.service_category, selected.service_type].filter(Boolean).join(" · ")} />
                <InfoRow icon={MapPin} label="City" value={selected.city || 'Not provided'} />
                {selected.preferred_date && <InfoRow icon={Calendar} label="Date" value={selected.preferred_date} />}
                {selected.preferred_time && <InfoRow icon={Clock} label="Time" value={selected.preferred_time} />}
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
                <div className="text-sm text-gray-700 bg-ivory-50 rounded-xl p-3">{selected.address || 'Address not provided'}</div>
              </div>
              {selected.problem_description && (
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem Description</div>
                  <div className="text-sm text-gray-700 bg-ivory-50 rounded-xl p-3">{selected.problem_description}</div>
                </div>
              )}
              {(() => {
                const rawAmount = selected.total_amount ?? selected.amount;
                const parsedAmount = rawAmount == null || rawAmount === '' ? null : Number(rawAmount);
                const amount = parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : null;
                return (
                  <div className="flex items-center justify-between rounded-xl bg-ivory-50 p-3">
                    <span className="text-sm font-medium text-gray-600">Customer total</span>
                    <span className="text-base font-extrabold text-navy-900">{amount === null ? 'Amount unavailable' : formatCurrency(amount)}</span>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[selected.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{statusLabels[selected.status] ?? selected.status.replace(/_/g, ' ')}</span>
              </div>

              {/* VATTAMS Communication Center */}
              <CommunicationCenter
                bookingNumber={selected.booking_number}
                customerName={selected.customer_name}
                serviceCategory={selected.service_category}
                variant="full"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof User; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}><Icon size={18} /></div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium"><Icon size={14} className="text-gray-400 shrink-0" /> {value}</div>
    </div>
  );
}
