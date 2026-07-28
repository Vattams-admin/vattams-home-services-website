import { useState, useEffect, useMemo } from 'react';
import {
  Loader, Calendar, User, Phone, MapPin, Wrench, DollarSign, TrendingUp,
  CheckCircle, Clock, X, ChevronDown, LogOut, LayoutDashboard, Users, Briefcase,
  LucideIcon,
} from 'lucide-react';
import { supabase, Booking, Technician, BookingStatus } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const statusOptions: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export default function AdminDashboard() {
  const { navigate } = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [assignTechId, setAssignTechId] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('vattams_admin')) {
      navigate('admin-login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('technicians').select('*').order('created_at', { ascending: false }),
    ]);
    setBookings(b ?? []);
    setTechnicians(t ?? []);
    setLoading(false);
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((b) => b.status === 'completed' && b.amount)
      .reduce((sum, b) => sum + (b.amount ?? 0), 0);
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      inProgress: bookings.filter((b) => b.status === 'in_progress').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      revenue,
      technicians: technicians.filter((t) => t.status === 'active').length,
    };
  }, [bookings, technicians]);

  const updateStatus = async (id: string, status: BookingStatus) => {
    setUpdating(true);
    await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selectedBooking?.id === id) setSelectedBooking((prev) => (prev ? { ...prev, status } : prev));
    setUpdating(false);
  };

  const assignTechnician = async () => {
    if (!selectedBooking || !assignTechId) return;
    setUpdating(true);
    await supabase
      .from('bookings')
      .update({ assigned_technician_id: assignTechId, status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', selectedBooking.id);
    await supabase.from('technician_jobs').insert({
      booking_id: selectedBooking.id,
      technician_id: assignTechId,
      status: 'assigned',
    });
    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedBooking.id ? { ...b, assigned_technician_id: assignTechId, status: 'confirmed' } : b
      )
    );
    setSelectedBooking(null);
    setAssignTechId('');
    setUpdating(false);
  };

  const logout = () => {
    sessionStorage.removeItem('vattams_admin');
    navigate('home');
  };

  if (loading) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="VATTAMS" className="h-14 w-auto rounded-xl" />
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  <LayoutDashboard size={22} className="text-blue-600" /> Admin Dashboard
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Manage bookings, technicians, and revenue.</p>
              </div>
            </div>
          <button onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Briefcase, label: 'Total Bookings', value: stats.total, color: 'bg-blue-600' },
            { icon: Clock, label: 'Pending', value: stats.pending, color: 'bg-amber-500' },
            { icon: TrendingUp, label: 'In Progress', value: stats.inProgress, color: 'bg-purple-500' },
            { icon: CheckCircle, label: 'Completed', value: stats.completed, color: 'bg-green-500' },
            { icon: Users, label: 'Technicians', value: stats.technicians, color: 'bg-indigo-500' },
            { icon: DollarSign, label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, color: 'bg-emerald-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', ...statusOptions] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
              }`}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No bookings found.</td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-blue-700">{b.booking_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">{b.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{b.service_category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{b.city}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[b.status]}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setSelectedBooking(b); setAssignTechId(b.assigned_technician_id ?? ''); }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Booking Details</h3>
                <p className="text-blue-600 font-bold text-sm">{selectedBooking.booking_number}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={User} label="Customer" value={selectedBooking.customer_name} />
                <InfoRow icon={Phone} label="Mobile" value={selectedBooking.mobile_number} />
                <InfoRow icon={Wrench} label="Service" value={selectedBooking.service_category} />
                <InfoRow icon={MapPin} label="City" value={selectedBooking.city} />
                {selectedBooking.preferred_date && (
                  <InfoRow icon={Calendar} label="Date" value={selectedBooking.preferred_date} />
                )}
                {selectedBooking.preferred_time && (
                  <InfoRow icon={Clock} label="Time" value={selectedBooking.preferred_time} />
                )}
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selectedBooking.address}</div>
              </div>

              {selectedBooking.problem_description && (
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selectedBooking.problem_description}</div>
                </div>
              )}

              {/* Assign Technician */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Technician</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={assignTechId} onChange={(e) => setAssignTechId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white text-sm appearance-none">
                      <option value="">Select technician...</option>
                      {technicians.filter((t) => t.status === 'active').map((t) => (
                        <option key={t.id} value={t.id}>{t.full_name} — {t.city}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={assignTechnician} disabled={!assignTechId || updating}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    Assign
                  </button>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((s) => (
                    <button key={s} onClick={() => updateStatus(selectedBooking.id, s)} disabled={updating}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors border ${
                        selectedBooking.status === s
                          ? statusColors[s]
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
        <Icon size={14} className="text-gray-400" /> {value}
      </div>
    </div>
  );
}
