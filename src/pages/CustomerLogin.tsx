import { useState } from 'react';
import { Loader, Search, Phone, Calendar, Wrench, MapPin, X } from 'lucide-react';
import { supabase, Booking } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function CustomerLogin() {
  const { navigate } = useRouter();
  const [mobile, setMobile] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('mobile_number', mobile)
      .order('created_at', { ascending: false });
    setBookings(data ?? []);
    setLoading(false);
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="VATTAMS HOME SERVICES" className="h-20 w-auto mx-auto mb-4 rounded-xl" />
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Track Your Bookings</h1>
          <p className="text-gray-500">Enter your mobile number to view your booking history and status.</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="tel" required pattern="[0-9]{10}" value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Enter your 10-digit mobile number"
              />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
              Track
            </button>
          </div>
        </form>

        {searched && !loading && bookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <X size={28} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No Bookings Found</h3>
            <p className="text-gray-500 text-sm mb-4">No bookings associated with this mobile number.</p>
            <button onClick={() => navigate('booking')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Book a Service
            </button>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Booking Number</div>
                    <div className="font-extrabold text-blue-700">{b.booking_number}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wrench size={14} className="text-gray-400" /> {b.service_category}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400" /> {b.city}
                  </div>
                  {b.preferred_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="text-gray-400" /> {b.preferred_date}
                    </div>
                  )}
                  {b.preferred_time && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="text-gray-400" /> {b.preferred_time}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
