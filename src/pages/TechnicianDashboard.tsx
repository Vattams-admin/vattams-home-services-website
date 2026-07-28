import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader, Wrench, MapPin, Phone, DollarSign, TrendingUp, CheckCircle,
  Clock, Camera, FileSignature, LogOut, Briefcase, Star, Wallet,
  Lock, Unlock, Bell, History, Plus, AlertCircle, ArrowDownCircle,
  ArrowUpCircle, ShieldCheck,
} from 'lucide-react';
import {
  supabase, Technician, TechnicianJob, Booking, JobStatus,
  WalletTransaction, WalletRecharge, TechnicianNotification,
} from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const jobStatusColors: Record<string, string> = {
  assigned: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const txnTypeMeta: Record<string, { icon: typeof ArrowDownCircle; color: string; sign: string }> = {
  registration_fee: { icon: ArrowDownCircle, color: 'text-green-600', sign: '+' },
  deposit_lock: { icon: Lock, color: 'text-amber-600', sign: '-' },
  deposit_release: { icon: Unlock, color: 'text-green-600', sign: '+' },
  commission_deduction: { icon: ArrowUpCircle, color: 'text-red-600', sign: '-' },
  recharge_credit: { icon: ArrowDownCircle, color: 'text-green-600', sign: '+' },
  recharge_debit: { icon: ArrowUpCircle, color: 'text-red-600', sign: '-' },
  adjustment: { icon: DollarSign, color: 'text-blue-600', sign: '+' },
};

const DEPOSIT_RELEASE_THRESHOLD = 3;
const WALLET_VIEWS = ['overview', 'history', 'recharge'] as const;

export default function TechnicianDashboard() {
  const { navigate } = useRouter();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [jobs, setJobs] = useState<(TechnicianJob & { booking?: Booking })[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
  const [notifications, setNotifications] = useState<TechnicianNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [walletView, setWalletView] = useState<'overview' | 'history' | 'recharge'>('overview');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_tech_id');
    if (!stored) {
      navigate('technician-login');
      return;
    }
    loadTechnician(stored);
  }, []);

  const loadTechnician = useCallback(async (techId: string) => {
    const { data: tech, error } = await supabase.from('technicians').select('*').eq('id', techId).maybeSingle();
    if (error || !tech) {
      sessionStorage.removeItem('vattams_tech_id');
      navigate('technician-login');
      setLoading(false);
      return;
    }
    if (tech.status !== 'active') {
      sessionStorage.removeItem('vattams_tech_id');
      navigate('technician-login');
      setLoading(false);
      return;
    }
    setTechnician(tech);
    await Promise.all([loadJobs(tech.id), loadWalletData(tech.id)]);
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async (techId: string) => {
    const { data: jobsData, error } = await supabase
      .from('technician_jobs')
      .select('*')
      .eq('technician_id', techId)
      .order('assigned_at', { ascending: false });
    if (error) console.error('[TechDashboard] jobs query error:', error);
    if (!jobsData) { setJobs([]); return; }
    const bookingIds = jobsData.map((j) => j.booking_id);
    const { data: bookingsData } = await supabase.from('bookings').select('*').in('id', bookingIds);
    const bookingMap = new Map((bookingsData ?? []).map((b) => [b.id, b]));
    setJobs(jobsData.map((j) => ({ ...j, booking: bookingMap.get(j.booking_id) })));
  }, []);

  const loadWalletData = useCallback(async (techId: string) => {
    const [txnRes, rechargeRes, notifRes] = await Promise.all([
      supabase.from('wallet_transactions').select('*').eq('technician_id', techId).order('created_at', { ascending: false }).limit(50),
      supabase.from('wallet_recharges').select('*').eq('technician_id', techId).order('created_at', { ascending: false }).limit(20),
      supabase.from('technician_notifications').select('*').eq('technician_id', techId).order('created_at', { ascending: false }).limit(20),
    ]);
    if (txnRes.error) console.error('[TechDashboard] transactions query error:', txnRes.error);
    if (rechargeRes.error) console.error('[TechDashboard] recharges query error:', rechargeRes.error);
    if (notifRes.error) console.error('[TechDashboard] notifications query error:', notifRes.error);
    setTransactions(txnRes.data ?? []);
    setRecharges(rechargeRes.data ?? []);
    setNotifications(notifRes.data ?? []);
  }, []);

  const updateJobStatus = async (jobId: string, status: JobStatus) => {
    setUpdatingId(jobId);
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from('technician_jobs').update(updates).eq('id', jobId);
    if (error) console.error('[TechDashboard] job status update error:', error);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    setUpdatingId(null);
  };

  const submitRecharge = async () => {
    if (!technician || !rechargeAmount) return;
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      setRechargeMsg({ type: 'error', text: 'Please enter a valid amount.' });
      return;
    }
    setRechargeSubmitting(true);
    setRechargeMsg(null);
    const { data, error } = await supabase.from('wallet_recharges').insert({
      technician_id: technician.id,
      amount: amt,
      status: 'pending',
    }).select().single();
    if (error) {
      console.error('[TechDashboard] recharge insert error:', error);
      setRechargeMsg({ type: 'error', text: 'Failed to submit recharge request. Please try again.' });
    } else {
      setRecharges((prev) => [data, ...prev]);
      setRechargeMsg({ type: 'success', text: 'Recharge request submitted! Admin will approve it shortly.' });
      setRechargeAmount('');
    }
    setRechargeSubmitting(false);
  };

  const markNotificationRead = async (notifId: string) => {
    const { error } = await supabase.from('technician_notifications').update({ is_read: true }).eq('id', notifId);
    if (!error) setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
  };

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      active: jobs.filter((j) => j.status === 'accepted' || j.status === 'in_progress' || j.status === 'assigned').length,
      earnings: jobs.filter((j) => j.status === 'completed').reduce((s, j) => s + (j.job_amount ?? 0), 0),
    };
  }, [jobs]);

  const jobsToUnlock = Math.max(0, DEPOSIT_RELEASE_THRESHOLD - (technician?.completed_jobs_count ?? 0));
  const depositMsg = technician?.deposit_released
    ? 'Your security deposit has been released and added to your available balance.'
    : 'Complete ' + jobsToUnlock + ' more job' + (jobsToUnlock !== 1 ? 's' : '') + ' to release your ₹' + Number(technician?.locked_deposit ?? 0).toLocaleString('en-IN') + ' deposit.';
  const unreadNotifs = notifications.filter((n) => !n.is_read);

  const logout = () => {
    sessionStorage.removeItem('vattams_tech_id');
    setTechnician(null);
    setJobs([]);
    navigate('technician-login');
  };

  if (loading) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!technician) {
    return null;
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="VATTAMS" className="h-14 w-auto rounded-xl" />
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">{technician.full_name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={13} /> {technician.city}
                <span className="text-gray-300">|</span>
                <span className={'px-2 py-0.5 rounded-full text-xs font-semibold capitalize ' + (
                  technician.status === 'active' ? 'bg-green-100 text-green-700' :
                  technician.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                )}>{technician.status}</span>
                {technician.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Star size={12} className="fill-amber-400" /> {technician.rating}
                  </span>
                )}
                {technician.wallet_locked && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    <Lock size={11} /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setWalletView('overview')} className="relative p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                <Bell size={18} className="text-gray-600" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Account Locked Banner */}
        {technician.wallet_locked && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">Your account is temporarily locked. Please recharge your wallet to continue.</p>
              <p className="text-red-600 text-xs mt-1">Commission due: ₹{Number(technician.commission_due).toLocaleString('en-IN')}. Submit a recharge request and admin will approve it to unlock your account.</p>
              <button onClick={() => setWalletView('recharge')}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Recharge Now
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Briefcase, label: 'Total Jobs', value: stats.total, color: 'bg-blue-600' },
            { icon: Clock, label: 'Active Jobs', value: stats.active, color: 'bg-amber-500' },
            { icon: CheckCircle, label: 'Completed', value: stats.completed, color: 'bg-green-500' },
            { icon: DollarSign, label: 'Earnings', value: `₹${stats.earnings.toLocaleString('en-IN')}`, color: 'bg-emerald-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={'w-10 h-10 rounded-lg ' + s.color + ' flex items-center justify-center mb-3'}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
              <Wallet size={20} className="text-blue-600" /> Wallet
            </h2>
            <div className="flex gap-1.5">
              <button onClick={() => setWalletView('overview')}
                className={walletView === 'overview' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200'}>
                Overview
              </button>
              <button onClick={() => setWalletView('history')}
                className={walletView === 'history' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200'}>
                History
              </button>
              <button onClick={() => setWalletView('recharge')}
                className={walletView === 'recharge' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200'}>
                Recharge
              </button>
            </div>
          </div>

          {/* Wallet Overview */}
          {walletView === 'overview' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs text-blue-600 font-semibold mb-1">Available Balance</div>
                  <div className="text-2xl font-extrabold text-blue-700">₹{Number(technician.available_balance).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="text-xs text-amber-600 font-semibold mb-1">Locked Deposit</div>
                  <div className="text-2xl font-extrabold text-amber-700">₹{Number(technician.locked_deposit).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-xs text-emerald-600 font-semibold mb-1">Total Balance</div>
                  <div className="text-2xl font-extrabold text-emerald-700">₹{Number(technician.wallet_balance).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="text-xs text-red-600 font-semibold mb-1">Commission Due</div>
                  <div className="text-2xl font-extrabold text-red-700">₹{Number(technician.commission_due).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Deposit Release Progress */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <ShieldCheck size={16} className="text-blue-600" />
                    Security Deposit Release Progress
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {technician.completed_jobs_count}/{DEPOSIT_RELEASE_THRESHOLD} jobs
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all"
                    style={{ width: Math.min((technician.completed_jobs_count / DEPOSIT_RELEASE_THRESHOLD) * 100, 100) + '%' }} />
                </div>
                <p className="text-xs text-gray-500">
                  {depositMsg}
                </p>
              </div>

              {/* Recent Notifications */}
              {notifications.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Bell size={15} className="text-gray-400" /> Recent Notifications
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n.id}
                        className={'flex items-start gap-2 rounded-xl p-3 text-sm border ' + (n.is_read ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-100')}>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{n.title}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{n.message}</div>
                        </div>
                        {!n.is_read && (
                          <button onClick={() => markNotificationRead(n.id)}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-700 shrink-0">Mark read</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet History */}
          {walletView === 'history' && (
            <div>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No wallet transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => {
                    const meta = txnTypeMeta[txn.type] ?? txnTypeMeta.adjustment;
                    const Icon = meta.icon;
                    return (
                      <div key={txn.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon size={16} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 capitalize">{txn.type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-400 truncate">{txn.description}</div>
                          <div className="text-xs text-gray-300 mt-0.5">{new Date(txn.created_at).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={'text-sm font-bold ' + (meta.sign === '+' ? 'text-green-600' : 'text-red-600')}>
                          {meta.sign}₹{Number(txn.amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recharge */}
          {walletView === 'recharge' && (
            <div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                  Submit a recharge request. After admin approves your payment, the amount will be credited to your wallet automatically.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="number" min="1" step="1" value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter amount (₹)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
                <button onClick={submitRecharge} disabled={rechargeSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {rechargeSubmitting ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Submit Request
                </button>
              </div>
              {rechargeMsg && (
                <div className={'rounded-xl p-3 text-sm mb-4 ' + (rechargeMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                  {rechargeMsg.text}
                </div>
              )}

              {/* Recharge History */}
              <div className="text-sm font-semibold text-gray-700 mb-2">Recharge History</div>
              {recharges.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No recharge requests yet.</p>
              ) : (
                <div className="space-y-2">
                  {recharges.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">₹{Number(r.amount).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('en-IN')}</div>
                      </div>
                      <span className={'px-2.5 py-1 rounded-full text-xs font-semibold capitalize ' + (
                        r.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      )}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-extrabold text-gray-900 text-lg mb-4">Your Jobs</h2>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No jobs assigned yet. Check back later.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  {job.booking && (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs text-gray-400 font-medium">Booking</div>
                          <div className="font-bold text-blue-700 text-sm">{job.booking.booking_number}</div>
                        </div>
                        <span className={'px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ' + jobStatusColors[job.status]}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Wrench size={14} className="text-gray-400" /> {job.booking.service_category}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin size={14} className="text-gray-400" /> {job.booking.city}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={14} className="text-gray-400" /> {job.booking.mobile_number}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <TrendingUp size={14} className="text-gray-400" /> {job.booking.customer_name}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{job.booking.address}</div>
                      </div>
                      {job.booking.problem_description && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{job.booking.problem_description}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {technician.wallet_locked ? (
                          <div className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                            <Lock size={14} /> Account locked — cannot accept new jobs
                          </div>
                        ) : (
                          <>
                            {job.status === 'assigned' && (
                              <>
                                <button onClick={() => updateJobStatus(job.id, 'accepted')} disabled={updatingId === job.id}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                                  Accept Job
                                </button>
                                <button onClick={() => updateJobStatus(job.id, 'rejected')} disabled={updatingId === job.id}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
                                  Reject
                                </button>
                              </>
                            )}
                            {job.status === 'accepted' && (
                              <button onClick={() => updateJobStatus(job.id, 'in_progress')} disabled={updatingId === job.id}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                                Start Work
                              </button>
                            )}
                            {job.status === 'in_progress' && (
                              <button onClick={() => updateJobStatus(job.id, 'completed')} disabled={updatingId === job.id}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                                Mark Complete
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Photo & Signature placeholders */}
                      {(job.status === 'in_progress' || job.status === 'completed') && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Camera size={16} className="text-gray-400" />
                            {job.service_photo_urls.length} photo(s)
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <FileSignature size={16} className="text-gray-400" />
                            {job.customer_signature ? 'Signed' : 'Pending signature'}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}