import { useState, useEffect, useMemo } from 'react';
import {
  Loader, Calendar, User, Phone, MapPin, Wrench, DollarSign, TrendingUp,
  CheckCircle, Clock, X, ChevronDown, LogOut, LayoutDashboard, Users, Briefcase,
  Trash2, Eye, XCircle, Star, Award, Wallet, Lock, Unlock, History, ShieldCheck,
  CreditCard, LucideIcon,
} from 'lucide-react';
import { supabase, Booking, Technician, BookingStatus, WalletTransaction, WalletRecharge } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { fetchAllPayments, fetchPendingPayments, updatePaymentStatus, PaymentRecord } from '@/lib/payments';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const techStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-red-100 text-red-700 border-red-200',
};

const techStatusLabel: Record<string, string> = {
  pending: 'Pending',
  active: 'Approved',
  inactive: 'Rejected',
};

const statusOptions: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

type Tab = 'bookings' | 'technicians' | 'wallet' | 'payments';

export default function AdminDashboard() {
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [techFilter, setTechFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [assignTechId, setAssignTechId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [techUpdating, setTechUpdating] = useState(false);
  const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([]);
  const [recharges, setRecharges] = useState<(WalletRecharge & { technician_name?: string })[]>([]);
  const [walletUpdating, setWalletUpdating] = useState(false);
  const [selectedWalletTech, setSelectedWalletTech] = useState<Technician | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('pending');
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('vattams_admin')) {
      navigate('admin-login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    const [bookingsRes, techRes] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('technicians').select('*').order('created_at', { ascending: false }),
    ]);

    if (bookingsRes.error) console.error('[AdminDashboard] bookings query error:', bookingsRes.error);
    if (techRes.error) console.error('[AdminDashboard] technicians query error:', techRes.error);

    console.log('[AdminDashboard] bookings raw:', bookingsRes.data);
    console.log('[AdminDashboard] technicians raw:', techRes.data);
    console.log('[AdminDashboard] active technicians for dropdown:',
      (techRes.data ?? []).filter((t) => t.status === 'active'));

    setBookings(bookingsRes.data ?? []);
    setTechnicians(techRes.data ?? []);

    const [txnRes, rechargeRes] = await Promise.all([
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('wallet_recharges').select('*, technician:technicians(full_name)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (txnRes.error) console.error('[AdminDashboard] wallet_transactions query error:', txnRes.error);
    if (rechargeRes.error) console.error('[AdminDashboard] wallet_recharges query error:', rechargeRes.error);
    setWalletTxns(txnRes.data ?? []);
    setRecharges((rechargeRes.data ?? []).map((r) => ({ ...r, technician_name: (r as Record<string, unknown>).technician ? ((r as Record<string, { full_name: string }>).technician).full_name : undefined })));

    const [pendingPay, allPay] = await Promise.all([
      fetchPendingPayments(),
      fetchAllPayments(),
    ]);
    setPayments(allPay);
    setLoading(false);
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const filteredTechnicians = useMemo(() => {
    if (techFilter === 'all') return technicians;
    return technicians.filter((t) => t.status === techFilter);
  }, [technicians, techFilter]);

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
      pendingTechs: technicians.filter((t) => t.status === 'pending').length,
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
    const { error: bookErr } = await supabase
      .from('bookings')
      .update({ assigned_technician_id: assignTechId, status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', selectedBooking.id);
    if (bookErr) console.error('[AdminDashboard] assign booking update error:', bookErr);

    const { error: jobErr } = await supabase.from('technician_jobs').insert({
      booking_id: selectedBooking.id,
      technician_id: assignTechId,
      status: 'assigned',
    });
    if (jobErr) console.error('[AdminDashboard] technician_jobs insert error:', jobErr);

    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedBooking.id ? { ...b, assigned_technician_id: assignTechId, status: 'confirmed' } : b
      )
    );
    setSelectedBooking(null);
    setAssignTechId('');
    setUpdating(false);
  };

  const updateTechStatus = async (id: string, status: 'active' | 'inactive') => {
    setTechUpdating(true);
    const { error } = await supabase.from('technicians').update({ status }).eq('id', id);
    if (!error) {
      setTechnicians((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      if (selectedTech?.id === id) setSelectedTech((prev) => (prev ? { ...prev, status } : prev));
    }
    setTechUpdating(false);
  };

  const approveRecharge = async (rechargeId: string) => {
    setWalletUpdating(true);
    const { error } = await supabase.from('wallet_recharges').update({
      status: 'approved', approved_at: new Date().toISOString(), approved_by: 'admin',
    }).eq('id', rechargeId);
    if (error) {
      console.error('[AdminDashboard] recharge approve error:', error);
    } else {
      setRecharges((prev) => prev.map((r) => (r.id === rechargeId ? { ...r, status: 'approved', approved_at: new Date().toISOString() } : r)));
      const r = recharges.find((x) => x.id === rechargeId);
      if (r) {
        const { data: updatedTech } = await supabase.from('technicians').select('*').eq('id', r.technician_id).maybeSingle();
        if (updatedTech) setTechnicians((prev) => prev.map((t) => (t.id === updatedTech.id ? updatedTech : t)));
        const { data: newTxns } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(100);
        if (newTxns) setWalletTxns(newTxns);
      }
    }
    setWalletUpdating(false);
  };

  const rejectRecharge = async (rechargeId: string) => {
    setWalletUpdating(true);
    const { error } = await supabase.from('wallet_recharges').update({
      status: 'rejected', approved_at: new Date().toISOString(), approved_by: 'admin',
    }).eq('id', rechargeId);
    if (error) {
      console.error('[AdminDashboard] recharge reject error:', error);
    } else {
      setRecharges((prev) => prev.map((r) => (r.id === rechargeId ? { ...r, status: 'rejected' } : r)));
    }
    setWalletUpdating(false);
  };

  const toggleWalletLock = async (techId: string, lock: boolean) => {
    setWalletUpdating(true);
    const { error } = await supabase.from('technicians').update({ wallet_locked: lock }).eq('id', techId);
    if (error) {
      console.error('[AdminDashboard] wallet lock toggle error:', error);
    } else {
      setTechnicians((prev) => prev.map((t) => (t.id === techId ? { ...t, wallet_locked: lock } : t)));
      if (selectedWalletTech?.id === techId) setSelectedWalletTech((prev) => (prev ? { ...prev, wallet_locked: lock } : prev));
    }
    setWalletUpdating(false);
  };

  const deleteTechnician = async (id: string) => {
    if (!confirm('Are you sure you want to delete this technician? This cannot be undone.')) return;
    setTechUpdating(true);
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (!error) {
      setTechnicians((prev) => prev.filter((t) => t.id !== id));
      if (selectedTech?.id === id) setSelectedTech(null);
    }
    setTechUpdating(false);
  };

  const verifyPayment = async (paymentId: string, status: 'success' | 'failed') => {
    setPaymentUpdating(true);
    const updated = await updatePaymentStatus(paymentId, status, undefined, 'admin');
    if (updated) {
      setPayments((prev) => prev.map((p) => (p.payment_id === paymentId ? updated : p)));
      // If it's a wallet_recharge success, also approve the recharge request
      if (status === 'success' && updated.purpose === 'wallet_recharge' && updated.reference_id) {
        const { data: recharge } = await supabase.from('wallet_recharges')
          .select('*').eq('technician_id', updated.reference_id).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (recharge) {
          await supabase.from('wallet_recharges').update({
            status: 'approved', approved_at: new Date().toISOString(), approved_by: 'admin',
          }).eq('id', recharge.id);
        }
      }
    }
    setPaymentUpdating(false);
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

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('bookings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'bookings' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Briefcase size={16} /> Bookings
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${tab === 'bookings' ? 'bg-white/20' : 'bg-gray-100'}`}>{stats.total}</span>
          </button>
          <button onClick={() => setTab('technicians')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'technicians' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Users size={16} /> Technicians
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${tab === 'technicians' ? 'bg-white/20' : 'bg-gray-100'}`}>{technicians.length}</span>
            {stats.pendingTechs > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">{stats.pendingTechs} new</span>
            )}
          </button>
          <button onClick={() => setTab('wallet')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'wallet' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Wallet size={16} /> Wallet
            {recharges.filter((r) => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">{recharges.filter((r) => r.status === 'pending').length}</span>
            )}
          </button>
          <button onClick={() => setTab('payments')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'payments' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <CreditCard size={16} /> Payments
            {payments.filter((p) => p.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">{payments.filter((p) => p.status === 'pending').length}</span>
            )}
          </button>
        </div>

        {/* ===================== BOOKINGS TAB ===================== */}
        {tab === 'bookings' && (
          <>
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
          </>
        )}

        {/* ===================== TECHNICIANS TAB ===================== */}
        {tab === 'technicians' && (
          <>
            {/* Tech Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'active', label: 'Approved' },
                { key: 'inactive', label: 'Rejected' },
              ] as const).map((s) => (
                <button key={s.key} onClick={() => setTechFilter(s.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    techFilter === s.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
                  }`}>
                  {s.label}
                  <span className="ml-1.5 text-xs opacity-70">
                    {s.key === 'all' ? technicians.length : technicians.filter((t) => t.status === s.key).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Technicians Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Mobile</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Service Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">City</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Experience</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTechnicians.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No technicians found.</td>
                      </tr>
                    ) : (
                      filteredTechnicians.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <User size={14} className="text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-800">{t.full_name}</div>
                                <div className="text-xs text-gray-400 sm:hidden">{t.mobile}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{t.mobile}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                            {t.specializations.length > 0 ? (
                              <span className="line-clamp-1 max-w-[180px]">{t.specializations.join(', ')}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{t.city}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden xl:table-cell">{t.experience_years} yrs</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${techStatusColors[t.status]}`}>
                              {techStatusLabel[t.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setSelectedTech(t)} title="View"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                                <Eye size={15} />
                              </button>
                              {t.status !== 'active' && (
                                <button onClick={() => updateTechStatus(t.id, 'active')} title="Approve" disabled={techUpdating}
                                  className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50">
                                  <CheckCircle size={15} />
                                </button>
                              )}
                              {t.status !== 'inactive' && (
                                <button onClick={() => updateTechStatus(t.id, 'inactive')} title="Reject" disabled={techUpdating}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50">
                                  <XCircle size={15} />
                                </button>
                              )}
                              <button onClick={() => deleteTechnician(t.id)} title="Delete" disabled={techUpdating}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Wallet Management Tab */}
        {tab === 'wallet' && (
          <div className="space-y-6">
            {/* Wallet Overview Cards per technician */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wallet size={16} className="text-blue-600" /> Technician Wallets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicians.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{t.full_name}</div>
                        <div className="text-xs text-gray-400">{t.city} · {t.mobile}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        t.wallet_locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {t.wallet_locked ? <><Lock size={10} /> Locked</> : <><Unlock size={10} /> Active</>}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xs text-blue-500 font-medium">Balance</div>
                        <div className="font-bold text-blue-700">₹{Number(t.wallet_balance).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2">
                        <div className="text-xs text-amber-500 font-medium">Locked Deposit</div>
                        <div className="font-bold text-amber-700">₹{Number(t.locked_deposit).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2">
                        <div className="text-xs text-emerald-500 font-medium">Available</div>
                        <div className="font-bold text-emerald-700">₹{Number(t.available_balance).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xs text-red-500 font-medium">Commission Due</div>
                        <div className="font-bold text-red-700">₹{Number(t.commission_due).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-blue-500" />
                        {t.deposit_released ? 'Deposit released' : `${t.completed_jobs_count}/3 jobs to release`}
                      </div>
                      <button onClick={() => setSelectedWalletTech(t)}
                        className="text-xs text-blue-600 font-semibold hover:text-blue-700">View Details</button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {t.wallet_locked ? (
                        <button onClick={() => toggleWalletLock(t.id, false)} disabled={walletUpdating}
                          className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                          Unlock
                        </button>
                      ) : (
                        <button onClick={() => toggleWalletLock(t.id, true)} disabled={walletUpdating}
                          className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                          Lock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {technicians.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400 text-sm">No technicians found.</div>
                )}
              </div>
            </div>

            {/* Recharge Approvals */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" /> Recharge Requests
              </h3>
              {recharges.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
                  No recharge requests.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Technician</th>
                          <th className="text-left px-4 py-3 font-medium">Amount</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Requested</th>
                          <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recharges.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-700">{r.technician_name ?? '—'}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                r.status === 'approved' ? 'bg-green-100 text-green-700' :
                                r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3">
                              {r.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button onClick={() => approveRecharge(r.id)} disabled={walletUpdating}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                                    Approve
                                  </button>
                                  <button onClick={() => rejectRecharge(r.id)} disabled={walletUpdating}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <History size={16} className="text-gray-600" /> Transaction History
              </h3>
              {walletTxns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
                  No transactions yet.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Type</th>
                          <th className="text-left px-4 py-3 font-medium">Amount</th>
                          <th className="text-left px-4 py-3 font-medium">Description</th>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {walletTxns.map((txn) => (
                          <tr key={txn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 capitalize text-gray-700 font-medium">{txn.type.replace(/_/g, ' ')}</td>
                            <td className={`px-4 py-3 font-bold ${txn.type === 'commission_deduction' || txn.type === 'deposit_lock' || txn.type === 'recharge_debit' ? 'text-red-600' : 'text-green-600'}`}>
                              {txn.type === 'commission_deduction' || txn.type === 'deposit_lock' || txn.type === 'recharge_debit' ? '-' : '+'}₹{Number(txn.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{txn.description}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(txn.created_at).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
                      {technicians.filter((t) => t.status === 'active').length === 0 && technicians.length > 0 && (
                        <option value="" disabled>No approved technicians found (check console for details)</option>
                      )}
                      {technicians.length === 0 && (
                        <option value="" disabled>Loading technicians... (check console)</option>
                      )}
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

      {/* Technician Detail Modal */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTech(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">{selectedTech.full_name}</h3>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${techStatusColors[selectedTech.status]}`}>
                    {techStatusLabel[selectedTech.status]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTech(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={Phone} label="Mobile" value={selectedTech.mobile} />
                <InfoRow icon={MapPin} label="City" value={selectedTech.city} />
                <InfoRow icon={Award} label="Experience" value={`${selectedTech.experience_years} years`} />
                <InfoRow icon={Star} label="Rating" value={selectedTech.rating > 0 ? `${selectedTech.rating} / 5` : 'No ratings yet'} />
              </div>

              {selectedTech.email && (
                <InfoRow icon={User} label="Email" value={selectedTech.email} />
              )}

              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Specializations</div>
                {selectedTech.specializations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTech.specializations.map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{s}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No specializations selected.</div>
                )}
              </div>

              {(selectedTech.id_proof_type || selectedTech.id_proof_number) && (
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">ID Proof</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                    {selectedTech.id_proof_type} {selectedTech.id_proof_number && `: ${selectedTech.id_proof_number}`}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-gray-900">{selectedTech.total_jobs}</div>
                  <div className="text-xs text-gray-400 font-medium">Total Jobs</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-gray-900">{selectedTech.rating > 0 ? selectedTech.rating : '—'}</div>
                  <div className="text-xs text-gray-400 font-medium">Rating</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-gray-900">₹{Number(selectedTech.earnings || 0).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-400 font-medium">Earnings</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {selectedTech.status !== 'active' && (
                  <button onClick={() => updateTechStatus(selectedTech.id, 'active')} disabled={techUpdating}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    <CheckCircle size={16} /> Approve
                  </button>
                )}
                {selectedTech.status !== 'inactive' && (
                  <button onClick={() => updateTechStatus(selectedTech.id, 'inactive')} disabled={techUpdating}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    <XCircle size={16} /> Reject
                  </button>
                )}
                <button onClick={() => deleteTechnician(selectedTech.id)} disabled={techUpdating}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors disabled:opacity-50">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Detail Modal */}
      {selectedWalletTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedWalletTech(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-gray-900 text-lg">Wallet — {selectedWalletTech.full_name}</h3>
              </div>
              <button onClick={() => setSelectedWalletTech(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3"><div className="text-xs text-blue-500 font-medium">Total Balance</div><div className="text-lg font-extrabold text-blue-700">₹{Number(selectedWalletTech.wallet_balance).toLocaleString('en-IN')}</div></div>
                <div className="bg-amber-50 rounded-xl p-3"><div className="text-xs text-amber-500 font-medium">Locked Deposit</div><div className="text-lg font-extrabold text-amber-700">₹{Number(selectedWalletTech.locked_deposit).toLocaleString('en-IN')}</div></div>
                <div className="bg-emerald-50 rounded-xl p-3"><div className="text-xs text-emerald-500 font-medium">Available</div><div className="text-lg font-extrabold text-emerald-700">₹{Number(selectedWalletTech.available_balance).toLocaleString('en-IN')}</div></div>
                <div className="bg-red-50 rounded-xl p-3"><div className="text-xs text-red-500 font-medium">Commission Due</div><div className="text-lg font-extrabold text-red-700">₹{Number(selectedWalletTech.commission_due).toLocaleString('en-IN')}</div></div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck size={14} className="text-blue-500" />
                <span className="text-gray-600">{selectedWalletTech.deposit_released ? 'Deposit released' : `Completed ${selectedWalletTech.completed_jobs_count}/3 jobs`}</span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {selectedWalletTech.wallet_locked ? (
                  <button onClick={() => toggleWalletLock(selectedWalletTech.id, false)} disabled={walletUpdating}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    Unlock Account
                  </button>
                ) : (
                  <button onClick={() => toggleWalletLock(selectedWalletTech.id, true)} disabled={walletUpdating}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    Lock Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== PAYMENTS TAB ===================== */}
      {tab === 'payments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">UPI Payments</h2>
            <div className="flex gap-2">
              {(['pending', 'success', 'failed', 'all'] as const).map((f) => (
                <button key={f} onClick={() => setPaymentFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    paymentFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {payments.filter((p) => paymentFilter === 'all' || p.status === paymentFilter).length === 0 ? (
              <div className="p-10 text-center">
                <CreditCard size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No {paymentFilter !== 'all' ? paymentFilter : ''} payments yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Payer</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Purpose</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">UTR</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.filter((p) => paymentFilter === 'all' || p.status === paymentFilter).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.payment_id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{p.payee_name || '—'}</div>
                          <div className="text-xs text-gray-400 capitalize">{p.payee_type} · {p.payee_id}</div>
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600">{p.purpose.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.utr || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.created_at).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={'px-2.5 py-1 rounded-full text-xs font-semibold capitalize ' + (
                            p.status === 'success' ? 'bg-green-100 text-green-700' :
                            p.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          )}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.status === 'pending' && (
                            <div className="flex justify-center gap-1.5">
                              <button onClick={() => verifyPayment(p.payment_id, 'success')} disabled={paymentUpdating}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                                Verify
                              </button>
                              <button onClick={() => verifyPayment(p.payment_id, 'failed')} disabled={paymentUpdating}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-gray-400 font-semibold uppercase">Total Payments</div>
              <div className="text-2xl font-extrabold text-gray-900">{payments.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-amber-500 font-semibold uppercase">Pending</div>
              <div className="text-2xl font-extrabold text-amber-600">{payments.filter((p) => p.status === 'pending').length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-green-500 font-semibold uppercase">Success</div>
              <div className="text-2xl font-extrabold text-green-600">{payments.filter((p) => p.status === 'success').length}</div>
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
        <Icon size={14} className="text-gray-400 shrink-0" /> {value}
      </div>
    </div>
  );
}
