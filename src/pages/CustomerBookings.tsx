import { useState, useEffect } from 'react';
import { Loader, Briefcase, Calendar, Clock, MapPin, Wrench, User, Phone, CheckCircle, X, ChevronRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Booking, BookingStatus, Customer } from '@/lib/supabase';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusSteps: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];

export default function CustomerBookings() {
  const { navigate } = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    if (!stored) { navigate('customer-login'); return; }
    try {
      const c = JSON.parse(stored) as Customer;
      setCustomer(c);
      loadBookings(c);
    } catch { navigate('customer-login'); }
  }, []);

  const loadBookings = async (c: Customer) => {
    // Fetch bookings by customer_id OR by mobile number (for pre-account bookings)
    const { data, error } = await supabase.from('bookings')
      .select('*').or(`customer_id.eq.${c.id},mobile_number.eq.${c.mobile}`)
      .order('created_at', { ascending: false });
    if (error) console.error('Booking fetch error:', error);
    setBookings(data ?? []);
    setLoading(false);
  };

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

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Briefcase size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">You have no bookings yet.</p>
            <button onClick={() => navigate('booking')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">Book Your First Service</button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const stepIndex = statusSteps.indexOf(b.status);
              const isCancelled = b.status === 'cancelled';
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(b)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-blue-700 text-sm">{b.booking_number}</div>
                      <div className="text-lg font-extrabold text-gray-900 mt-0.5">{b.service_category}</div>
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

                  {/* Progress tracker */}
                  {!isCancelled ? (
                    <div className="flex items-center gap-1 mb-2">
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
                    <div className="text-xs text-red-600 font-semibold mb-2">Booking was cancelled</div>
                  )}

                  <div className="flex items-center justify-end text-blue-600 text-sm font-semibold">
                    View Details <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              </div>
            </div>
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
