import { useState, useEffect } from 'react';
import { Loader, Briefcase, Calendar, Clock, MapPin, Wrench, User, Phone, CheckCircle, X, ChevronRight, Trash2, RefreshCw, Star } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Booking, Customer } from '@/lib/supabase';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusSteps = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function CustomerBookings() {
  const { navigate } = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [technician, setTechnician] = useState<{ full_name: string; mobile: string; rating: number } | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });
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
    const { data, error } = await supabase.from('bookings')
      .select('*').or(`customer_id.eq.${c.id},mobile_number.eq.${c.mobile}`)
      .order('created_at', { ascending: false });
    if (error) console.error('Booking fetch error:', error);
    setBookings(data ?? []);
    setLoading(false);
  };

  const openDetail = async (b: Booking) => {
    setSelected(b);
    setTechnician(null);
    setHasReview(false);
    if (b.assigned_technician_id) {
      const { data: tech } = await supabase.from('technicians')
        .select('full_name, mobile, rating').eq('id', b.assigned_technician_id).maybeSingle();
      setTechnician(tech);
    }
    if (b.status === 'completed') {
      const { data: rev } = await supabase.from('reviews')
        .select('id').eq('booking_id', b.id).maybeSingle();
      setHasReview(!!rev);
    }
  };

  const handleCancel = async () => {
    if (!selected || !customer) return;
    if (!['pending', 'confirmed'].includes(selected.status)) {
      showToast('error', 'Only pending or confirmed bookings can be cancelled.');
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', selected.id);
    setActionLoading(false);
    if (error) { showToast('error', 'Failed to cancel booking.'); return; }
    showToast('success', 'Booking cancelled successfully.');
    setSelected(null);
    loadBookings(customer);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !customer) return;
    if (!['pending', 'confirmed'].includes(selected.status)) {
      showToast('error', 'Only pending or confirmed bookings can be rescheduled.');
      return;
    }
    if (!rescheduleForm.date) { showToast('error', 'Please select a new date.'); return; }

    setActionLoading(true);
    const { error } = await supabase.from('bookings')
      .update({
        preferred_date: rescheduleForm.date,
        preferred_time: rescheduleForm.time || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selected.id);

    setActionLoading(false);
    if (error) { showToast('error', 'Failed to reschedule booking.'); return; }

    showToast('success', 'Booking rescheduled successfully.');
    setRescheduleOpen(false);
    setRescheduleForm({ date: '', time: '' });
    setSelected(null);
    loadBookings(customer);
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'confirmed', 'in_progress'].includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  if (loading) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50"><Loader className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"><Briefcase size={24} className="text-blue-600" /> My Bookings</h1>
          <button onClick={() => navigate('booking')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">Book New Service</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'active', 'completed', 'cancelled'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-colors ${
                filter === f ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f} {f === 'all' ? `(${bookings.length})` : `(${bookings.filter((b) => f === 'active' ? ['pending', 'confirmed', 'in_progress'].includes(b.status) : b.status === f).length})`}
            </button>
          ))}
        </div>

        {toast && (
          <div className={`rounded-xl p-3 text-sm mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.text}</div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Briefcase size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No bookings found.</p>
            <button onClick={() => navigate('booking')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">Book Your First Service</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const stepIndex = statusSteps.indexOf(b.status);
              const isCancelled = b.status === 'cancelled';
              const canCancel = ['pending', 'confirmed'].includes(b.status);
              const canReschedule = ['pending', 'confirmed'].includes(b.status);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => openDetail(b)}>
                    <div>
                      <div className="font-bold text-blue-700 text-sm">{b.booking_number}</div>
                      <div className="text-lg font-extrabold text-gray-900 mt-0.5">{b.service_category}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[b.status]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3 cursor-pointer" onClick={() => openDetail(b)}>
                    <div className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /> {b.city}</div>
                    {b.preferred_date && <div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {b.preferred_date}</div>}
                    {b.preferred_time && <div className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> {b.preferred_time}</div>}
                    {b.amount && <div className="font-bold text-gray-900">₹{b.amount}</div>}
                  </div>

                  {!isCancelled ? (
                    <div className="flex items-center gap-1 mb-3 cursor-pointer" onClick={() => openDetail(b)}>
                      {statusSteps.map((s, i) => (
                        <div key={s} className="flex items-center flex-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                          </div>
                          {i < statusSteps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${i < stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-red-600 font-semibold mb-3">Booking was cancelled</div>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={() => openDetail(b)} className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
                      View Details <ChevronRight size={16} />
                    </button>
                    {canCancel && (
                      <button onClick={() => openDetail(b)} className="flex items-center gap-1 text-red-500 text-sm font-semibold hover:underline ml-auto">
                        <Trash2 size={14} /> Cancel
                      </button>
                    )}
                    {canReschedule && (
                      <button onClick={() => { setSelected(b); setRescheduleOpen(true); }} className="flex items-center gap-1 text-amber-600 text-sm font-semibold hover:underline">
                        <RefreshCw size={14} /> Reschedule
                      </button>
                    )}
                    {b.status === 'completed' && !hasReview && (
                      <button onClick={() => navigate('customer-reviews')} className="flex items-center gap-1 text-amber-600 text-sm font-semibold hover:underline ml-auto">
                        <Star size={14} /> Rate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selected && !rescheduleOpen && (
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
                <InfoRow icon={Phone} label="Mobile" value={selected.mobile_number} />
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

              {/* Assigned Technician */}
              {technician && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-2">Assigned Technician</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center"><User size={18} className="text-blue-700" /></div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-sm">{technician.full_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Phone size={12} /> {technician.mobile}
                        {technician.rating > 0 && <span className="flex items-center gap-0.5"><Star size={12} className="text-amber-500 fill-amber-500" /> {technician.rating}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              </div>

              {/* Actions */}
              {['pending', 'confirmed'].includes(selected.status) && (
                <div className="flex gap-3 pt-2">
                  <button onClick={handleCancel} disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors disabled:opacity-60">
                    {actionLoading ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />} Cancel Booking
                  </button>
                  <button onClick={() => setRescheduleOpen(true)} disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-xl transition-colors disabled:opacity-60">
                    <RefreshCw size={18} /> Reschedule
                  </button>
                </div>
              )}
              {selected.status === 'completed' && (
                <button onClick={() => navigate('customer-reviews')} className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-xl transition-colors">
                  <Star size={18} /> {hasReview ? 'View Your Review' : 'Rate This Service'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {selected && rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRescheduleOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-lg">Reschedule Booking</h3>
              <button onClick={() => setRescheduleOpen(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleReschedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Preferred Date</label>
                <input type="date" required value={rescheduleForm.date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Preferred Time</label>
                <select value={rescheduleForm.time} onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm">
                  <option value="">Any time</option>
                  <option value="08:00-10:00">8:00 AM - 10:00 AM</option>
                  <option value="10:00-12:00">10:00 AM - 12:00 PM</option>
                  <option value="12:00-14:00">12:00 PM - 2:00 PM</option>
                  <option value="14:00-16:00">2:00 PM - 4:00 PM</option>
                  <option value="16:00-18:00">4:00 PM - 6:00 PM</option>
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                Booking: <span className="font-bold">{selected.booking_number}</span><br />
                Current: {selected.preferred_date ?? 'Not set'} {selected.preferred_time ?? ''}
              </div>
              <button type="submit" disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
                {actionLoading ? <Loader size={18} className="animate-spin" /> : <RefreshCw size={18} />} Confirm Reschedule
              </button>
            </form>
          </div>
        </div>
      )}
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
