import { useState, useEffect } from 'react';
import { Loader, Briefcase, Calendar, Clock, MapPin, Wrench, CheckCircle, X, ChevronRight, Bell, TrendingUp, CreditCard, Star, Phone, User } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Booking, Customer } from '@/lib/supabase';
import CommunicationCenter from '@/components/CommunicationCenter';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusSteps = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function CustomerDashboard() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; created_at: string; is_read: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try {
      const c = JSON.parse(stored) as Customer;
      setCustomer(c);
      Promise.all([loadBookings(c), loadNotifications(c)]).finally(() => setLoading(false));
    } catch { navigate('customer-login'); }
  }, []);

  const loadBookings = async (c: Customer) => {
    const { data } = await supabase.from('bookings')
      .select('*').or(`customer_id.eq.${c.id},mobile_number.eq.${c.mobile}`)
      .order('created_at', { ascending: false });
    setBookings(data ?? []);
  };

  const loadNotifications = async (c: Customer) => {
    const { data } = await supabase.from('notifications')
      .select('*').eq('recipient_type', 'customer').eq('recipient_id', c.mobile)
      .order('created_at', { ascending: false }).limit(5);
    setNotifications(data ?? []);
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50"><Loader className="animate-spin text-blue-600" size={32} /></div>;
  }

  const activeBookings = bookings.filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const upcomingBooking = activeBookings.find((b) => b.preferred_date) ?? activeBookings[0];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const quickLinks = [
    { label: 'My Bookings', icon: Briefcase, page: 'customer-bookings' as const, color: 'bg-blue-100 text-blue-600' },
    { label: 'Payments', icon: CreditCard, page: 'customer-payments' as const, color: 'bg-green-100 text-green-600' },
    { label: 'Reviews', icon: Star, page: 'customer-reviews' as const, color: 'bg-amber-100 text-amber-600' },
    { label: 'Profile', icon: User, page: 'customer-profile' as const, color: 'bg-purple-100 text-purple-600' },
    { label: 'Support', icon: Phone, page: 'customer-support' as const, color: 'bg-red-100 text-red-600' },
    { label: 'Book New', icon: Wrench, page: 'booking' as const, color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Welcome back, {customer.full_name.split(' ')[0]}!</h1>
              <p className="text-blue-100 text-sm mt-1">Here's your service overview</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('booking')} className="px-5 py-2.5 bg-white text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors">
                Book a Service
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Briefcase} label="Active Bookings" value={String(activeBookings.length)} color="bg-blue-100 text-blue-600" />
          <StatCard icon={CheckCircle} label="Completed" value={String(completedBookings.length)} color="bg-green-100 text-green-600" />
          <StatCard icon={TrendingUp} label="Total Bookings" value={String(bookings.length)} color="bg-purple-100 text-purple-600" />
          <StatCard icon={Bell} label="Notifications" value={String(unreadCount)} color="bg-amber-100 text-amber-600" />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {quickLinks.map((q) => (
            <button key={q.label} onClick={() => navigate(q.page)}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
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
              <button onClick={() => navigate('customer-bookings')} className="text-sm text-blue-600 font-semibold hover:underline">View All</button>
            </div>
            {activeBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <Briefcase size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No active bookings right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.slice(0, 3).map((b) => {
                  const stepIndex = statusSteps.indexOf(b.status);
                  return (
                    <div key={b.id} onClick={() => setSelected(b)}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold text-blue-700 text-xs">{b.booking_number}</div>
                          <div className="font-extrabold text-gray-900 mt-0.5">{b.service_category}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[b.status]}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /> {b.city}</div>
                        {b.preferred_date && <div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {b.preferred_date}</div>}
                        {b.preferred_time && <div className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> {b.preferred_time}</div>}
                        {b.amount && <div className="font-bold text-gray-900">₹{b.amount}</div>}
                      </div>
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
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booking History */}
            <div className="flex items-center justify-between mb-4 mt-6">
              <h2 className="text-lg font-extrabold text-gray-900">Recent History</h2>
            </div>
            {completedBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-gray-500 text-sm">No completed bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedBookings.slice(0, 3).map((b) => (
                  <div key={b.id} onClick={() => setSelected(b)}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{b.service_category}</div>
                      <div className="text-xs text-gray-400">{b.booking_number} · {new Date(b.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {b.amount && <span className="font-bold text-gray-900 text-sm">₹{b.amount}</span>}
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
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Wrench size={18} className="text-blue-600" /></div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{upcomingBooking.service_category}</div>
                      <div className="text-xs text-gray-400">{upcomingBooking.booking_number}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {upcomingBooking.preferred_date && <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> {upcomingBooking.preferred_date}</div>}
                    {upcomingBooking.preferred_time && <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {upcomingBooking.preferred_time}</div>}
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {upcomingBooking.city}</div>
                  </div>
                  <div className={`mt-3 px-3 py-1.5 rounded-full text-xs font-semibold capitalize border inline-block ${statusColors[upcomingBooking.status]}`}>
                    {upcomingBooking.status.replace('_', ' ')}
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
              {notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No notifications.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className={`bg-white rounded-xl border shadow-sm p-3 ${n.is_read ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    </div>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Booking Details</h3>
                <p className="text-blue-600 font-bold text-sm">{selected.booking_number}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={User} label="Customer" value={selected.customer_name} />
                <InfoRow icon={Wrench} label="Service" value={selected.service_category} />
                <InfoRow icon={MapPin} label="City" value={selected.city} />
                {selected.preferred_date && <InfoRow icon={Calendar} label="Date" value={selected.preferred_date} />}
                {selected.preferred_time && <InfoRow icon={Clock} label="Time" value={selected.preferred_time} />}
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.address}</div>
              </div>
              {selected.problem_description && (
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem Description</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.problem_description}</div>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              </div>

              {/* VATTAMS Communication Center */}
              <CommunicationCenter
                bookingNumber={selected.booking_number}
                customerName={selected.customer_name}
                serviceCategory={selected.service_category}
                variant="full"
              />
            </div>
          </div>
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
