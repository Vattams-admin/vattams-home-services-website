import { buildUpiLink, generateUpiQrCode } from '@/lib/payments';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Wallet,
  Star,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Bell,
  User,
  LogOut,
  RefreshCw,
  ChevronRight,
  Navigation,
  Wrench,
  CalendarDays,
  CreditCard,
  AlertCircle,
  XCircle,
  PlayCircle,
  IndianRupee,
  Menu,
  X,
  BadgeCheck,
  Download,
} from 'lucide-react';

import { useRouter } from '@/lib/routerContext';
import { downloadOnboardingLetter } from '@/lib/onboardingLetter';
import { technicianData } from '@/lib/technicianData';
import PushNotificationSetup from '@/components/PushNotificationSetup';
import {
  NotificationRow,
} from '@/lib/notifications';

import type {
  Technician,
  TechnicianJob,
  WalletTransaction,
  WalletRecharge,
  TechnicianNotification,
} from '@/lib/supabase';

// Booking/job-flow notifications (job_assigned, new_booking, registration_*)
// are written by src/lib/notifications.ts into the shared `notifications`
// table. Wallet-flow notifications (deposit, commission, wallet_low, etc.)
// are written directly by DB triggers into `technician_notifications`.
// This merged type lets the UI display both in one unified list without
// touching either table's schema or the DB triggers that feed them.
type MergedTechNotification =
  | (TechnicianNotification & { _source: 'wallet' })
  | (NotificationRow & { _source: 'job' });

type DashboardTab =
  | 'overview'
  | 'jobs'
  | 'wallet'
  | 'profile'
  | 'notifications';

const JOB_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  on_the_way: 'On the Way',
  in_progress: 'In Progress',
  job_started: 'Job Started',
  job_completed: 'Awaiting Customer Confirmation',
  completed: 'Completed',
  rejected: 'Rejected',
};

const JOB_STATUS_CLASSES: Record<string, string> = {
  assigned: 'bg-[#f8f4e8] text-[#0b1f3a] border-blue-100',
  accepted: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  on_the_way: 'bg-purple-50 text-purple-700 border-purple-100',
  in_progress: 'bg-[#f8f4e8] text-orange-700 border-[#e7dcc0]',
  job_started: 'bg-[#f8f4e8] text-orange-700 border-[#e7dcc0]',
  job_completed: 'bg-teal-50 text-teal-700 border-teal-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const PENDING_JOB_UPDATE_KEY = 'vattams_pending_technician_job_update';

interface PendingJobUpdate {
  technicianId: string;
  jobId: string;
  status: 'on_the_way' | 'job_completed';
}

function readPendingJobUpdate(): PendingJobUpdate | null {
  try {
    const raw = sessionStorage.getItem(PENDING_JOB_UPDATE_KEY);
    if (!raw) return null;
    const value: Partial<PendingJobUpdate> | null = JSON.parse(raw);
    if (typeof value?.technicianId !== 'string' || !value.technicianId
      || typeof value.jobId !== 'string' || !value.jobId
      || (value.status !== 'on_the_way' && value.status !== 'job_completed')) return null;
    return { technicianId: value.technicianId, jobId: value.jobId, status: value.status };
  } catch {
    return null;
  }
}

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN')}`;
}

function getInitials(name?: string | null) {
  if (!name) return 'T';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function TechnicianDashboard() {
  const { navigate } = useRouter();

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [jobs, setJobs] = useState<TechnicianJob[]>([]);
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  const pendingOffer = jobs.find(job => job.status === 'assigned' && !dismissedOffers.includes(job.id));
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
  const [notifications, setNotifications] = useState<
    TechnicianNotification[]
  >([]);
  const [jobNotifications, setJobNotifications] = useState<NotificationRow[]>([]);

  const [activeTab, setActiveTab] =
    useState<DashboardTab>('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [processingJob, setProcessingJob] = useState<string | null>(null);
  const [queuedUpdate, setQueuedUpdate] = useState<PendingJobUpdate | null>(readPendingJobUpdate);

  useEffect(() => {
    try {
      if (queuedUpdate) sessionStorage.setItem(PENDING_JOB_UPDATE_KEY, JSON.stringify(queuedUpdate));
      else sessionStorage.removeItem(PENDING_JOB_UPDATE_KEY);
    } catch {
      // The pending update remains available in memory if storage is blocked.
    }
  }, [queuedUpdate]);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [rechargeSubmitting, setRechargeSubmitting] =
    useState(false);
  const [rechargeMessage, setRechargeMessage] = useState('');

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const result = await technicianData<{
        technician: Technician;
        jobs: TechnicianJob[];
        transactions: WalletTransaction[];
        recharges: WalletRecharge[];
        notifications: TechnicianNotification[];
        jobNotifications: NotificationRow[];
      }>('account');
      if (!result?.technician) {
        setTechnician(null); setJobs([]); setTransactions([]); setRecharges([]); setNotifications([]);
        sessionStorage.removeItem('vattams_technician_session');
        sessionStorage.removeItem('vattams_technician_expires');
        navigate('technician-login'); return;
      }
      setTechnician(result.technician);
      setJobs(result.jobs ?? []); setTransactions(result.transactions ?? []);
      setRecharges(result.recharges ?? []);
      setNotifications(result.notifications ?? []);
      setJobNotifications(result.jobNotifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load technician dashboard.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [navigate]);

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  /*
   * Realtime refresh for technician jobs and notifications.
   */
  // Realtime is intentionally disabled for custom technician sessions.
  // All sensitive job/notification refreshes go through technician-data.
  useEffect(() => {
    if (!technician?.id) return;
    const refresh = window.setInterval(() => { void loadDashboard(false); }, 30000);
    return () => window.clearInterval(refresh);
  }, [technician?.id, loadDashboard]);

  const mergedNotifications: MergedTechNotification[] = useMemo(
    () =>
      [
        ...notifications.map((n) => ({ ...n, _source: 'wallet' as const })),
        ...jobNotifications.map((n) => ({ ...n, _source: 'job' as const })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [notifications, jobNotifications]
  );

  const unreadNotifications = useMemo(
    () =>
      mergedNotifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [mergedNotifications]
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) =>
        [
          'assigned',
          'accepted',
          'on_the_way',
          'in_progress',
          'job_started',
        ].includes(job.status)
      ),
    [jobs]
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter((job) => job.status === 'completed'),
    [jobs]
  );

  const totalJobEarnings = useMemo(
    () =>
      completedJobs.reduce(
        (total, job) =>
          total + Math.max(0, Number(job.job_amount || 0) - Number(job.offered_commission ?? job.call_rate_fee ?? 0)),
        0
      ),
    [completedJobs]
  );

  const pendingRecharge = useMemo(
    () =>
      recharges
        .filter(
          (recharge) =>
            recharge.status === 'pending'
        )
        .reduce(
          (total, recharge) =>
            total + Number(recharge.amount || 0),
          0
        ),
    [recharges]
  );

  const profileScore = technician?.profile_score || 0;

  const isOnline =
    technician?.is_online === true;

  const setOnlineStatus = async (online: boolean) => {
    if (!technician) return;
    setError('');
    try {
      const result = await technicianData<{ technician?: Technician }>('online', { online });
      if (!result?.technician || typeof result.technician.is_online !== 'boolean') {
        throw new Error('The server did not confirm the technician availability change.');
      }
      setTechnician(result.technician);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update technician availability.');
    }
  };

  const retryQueuedUpdate = useCallback(async () => {
    if (!queuedUpdate || queuedUpdate.technicianId !== technician?.id || processingJob || !navigator.onLine) return;
    setProcessingJob(queuedUpdate.jobId);
    setError('');
    try {
      await technicianData('job_status', { job_id: queuedUpdate.jobId, status: queuedUpdate.status });
      setQueuedUpdate(null);
      await loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync job update.');
      await loadDashboard(false);
    } finally {
      setProcessingJob(null);
    }
  }, [queuedUpdate, technician?.id, processingJob, loadDashboard]);

  useEffect(() => {
    const onReconnect = () => { void retryQueuedUpdate(); };
    window.addEventListener('online', onReconnect);
    return () => window.removeEventListener('online', onReconnect);
  }, [retryQueuedUpdate]);

  const updateJobStatus = async (job: TechnicianJob, status: 'accepted'|'rejected'|'on_the_way'|'in_progress'|'job_started'|'job_completed') => {
    if (!technician || processingJob) return;
    if (!navigator.onLine) {
      if (status === 'on_the_way' || status === 'job_completed') {
        if (queuedUpdate?.technicianId === technician.id) {
          setError('Sync or discard the pending update before saving another one.');
          return;
        }
        setQueuedUpdate({ technicianId: technician.id, jobId: job.id, status });
        setError('');
      } else {
        setError('Reconnect to the internet to update this job.');
      }
      return;
    }
    if (queuedUpdate?.jobId === job.id && queuedUpdate.technicianId === technician.id) {
      setError('Sync or discard the pending update before changing this job.');
      return;
    }
    setProcessingJob(job.id); setError('');
    try { await technicianData('job_status', { job_id: job.id, status }); await loadDashboard(false); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update job status.'); }
    finally { setProcessingJob(null); }
  };

  const markNotificationRead = async (
    notification: MergedTechNotification
  ) => {
    if (notification.is_read) return;

    try {
      if (notification._source === 'job') {
        await technicianData('notification_read', { notification_id: notification.id, source: 'job' });
        setJobNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );
        return;
      }

      await technicianData('notification_read', { notification_id: notification.id });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead =
    async () => {
      if (!technician) return;

      try {
        await technicianData('notifications_read_all');

        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
          }))
        );
        setJobNotifications((current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };

  const submitRecharge = async () => {
    if (!technician) return;
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) { setRechargeMessage('Please enter a valid amount.'); return; }
    setRechargeSubmitting(true); setRechargeMessage('');
    try {
      await technicianData('recharge', { amount, payment_ref: paymentRef.trim() || null });
      setRechargeAmount(''); setPaymentRef('');
      setRechargeMessage('Recharge request submitted successfully. Admin will review it.');
      await loadDashboard(false);
    } catch (err) { setRechargeMessage(err instanceof Error ? err.message : 'Unable to submit recharge request.'); }
    finally { setRechargeSubmitting(false); }
  };

  const logout = async () => {
    setQueuedUpdate(null);
    try { sessionStorage.removeItem(PENDING_JOB_UPDATE_KEY); } catch { /* Storage may be blocked. */ }
    sessionStorage.removeItem('vattams_technician_session');
    sessionStorage.removeItem('vattams_technician_expires');
    sessionStorage.removeItem('vattams_technician_id');
    sessionStorage.removeItem(
      'technician_id'
    );
    sessionStorage.removeItem(
      'vattams_technician_mobile'
    );
    sessionStorage.removeItem(
      'technician_mobile'
    );

    navigate('technician-login');
  };

  const goToTab = (
    tab: DashboardTab
  ) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e1d2] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#f8f4e8] flex items-center justify-center mx-auto mb-4">
            <RefreshCw
              size={26}
              className="text-[#b08b18] animate-spin"
            />
          </div>

          <h2 className="font-bold text-gray-900">
            Loading Technician Dashboard
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e8e1d2] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle
              size={28}
              className="text-red-500"
            />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Technician Login Required
          </h2>

          <p className="text-sm text-gray-500 mb-6">
            {error ||
              'Please login to access your technician dashboard.'}
          </p>

          <button
            onClick={() =>
              navigate('technician-login')
            }
            className="w-full py-3 bg-[#c9a227] hover:bg-[#b08b18] text-white font-bold rounded-xl"
          >
            Go to Technician Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed] pt-20 md:pt-24">
      {queuedUpdate?.technicianId === technician.id && (
        <section aria-label="Pending job update" className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 bg-amber-100 p-3 text-sm text-amber-950">
          <p role="status">Sync pending · Job {queuedUpdate.jobId.slice(0, 8)} · {queuedUpdate.status === 'on_the_way' ? 'On the Way' : 'Done'}. After a reload, select Retry sync.</p>
          <button type="button" disabled={!!processingJob} onClick={() => void retryQueuedUpdate()}
            className="rounded-lg bg-amber-200 px-3 py-2 font-bold disabled:opacity-50">Retry sync</button>
          <button type="button" disabled={!!processingJob} onClick={() => { setQueuedUpdate(null); setError(''); }}
            className="rounded-lg px-3 py-2 underline disabled:opacity-50">Discard update</button>
        </section>
      )}
      {pendingOffer && (
        <aside aria-label="New job offer"
          className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-orange-400 bg-neutral-950 p-4 text-white shadow-xl">
          <div role="status">
            <p className="text-sm font-semibold text-orange-300">New job offer</p>
            <h2 className="my-1 text-lg font-bold">{pendingOffer.service_type || 'Service request'}</h2>
            <p className="text-sm text-neutral-300">Job {pendingOffer.id.slice(0, 8)}</p>
            {pendingOffer.offered_commission != null && (
              <p className="mt-2 font-semibold">VATTAMS commission {formatMoney(pendingOffer.offered_commission)} after completion</p>
            )}
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-orange-200">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!!processingJob}
              onClick={() => void updateJobStatus(pendingOffer, 'accepted')}
              className="rounded-lg bg-orange-400 px-4 py-2 font-bold text-black disabled:opacity-50">Accept</button>
            <button type="button" disabled={!!processingJob}
              onClick={() => void updateJobStatus(pendingOffer, 'rejected')}
              className="rounded-lg border border-neutral-500 px-4 py-2 disabled:opacity-50">Reject</button>
            <button type="button" disabled={!!processingJob}
              onClick={() => setDismissedOffers(current => [...current, pendingOffer.id])}
              className="rounded-lg px-3 py-2 text-neutral-300">Later</button>
          </div>
        </aside>
      )}
      {/* HEADER */}
      <header className="bg-white border-b border-[#e8e1d2] sticky top-20 md:top-24 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c9a227] text-white flex items-center justify-center font-extrabold">
                {getInitials(
                  technician.full_name
                )}
              </div>

              <div className="hidden sm:block">
                <div className="font-bold text-gray-900">
                  {technician.full_name}
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  Technician Dashboard
                  {technician.employee_id && (
                    <span className="px-1.5 py-0.5 rounded bg-[#f8f4e8] text-[#a47c00] font-bold">
                      {technician.employee_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() =>
                  goToTab('overview')
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === 'overview'
                    ? 'bg-[#f8f4e8] text-[#a47c00]'
                    : 'text-gray-600 hover:bg-[#f7f4ed]'
                }`}
              >
                Overview
              </button>

              <button
                onClick={() =>
                  goToTab('jobs')
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === 'jobs'
                    ? 'bg-[#f8f4e8] text-[#a47c00]'
                    : 'text-gray-600 hover:bg-[#f7f4ed]'
                }`}
              >
                Call Rate Jobs
              </button>

              <button
                onClick={() =>
                  goToTab('wallet')
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === 'wallet'
                    ? 'bg-[#f8f4e8] text-[#a47c00]'
                    : 'text-gray-600 hover:bg-[#f7f4ed]'
                }`}
              >
                Wallet
              </button>

              <button
                onClick={() =>
                  goToTab('profile')
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === 'profile'
                    ? 'bg-[#f8f4e8] text-[#a47c00]'
                    : 'text-gray-600 hover:bg-[#f7f4ed]'
                }`}
              >
                Profile
              </button>

              <button
                onClick={() =>
                  goToTab(
                    'notifications'
                  )
                }
                className="relative p-2 rounded-lg text-gray-600 hover:bg-[#f7f4ed]"
              >
                <Bell size={20} />

                {unreadNotifications >
                  0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications >
                    9
                      ? '9+'
                      : unreadNotifications}
                  </span>
                )}
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>

            <button
              onClick={() =>
                setMobileMenuOpen(
                  (value) => !value
                )
              }
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-[#f7f4ed]"
            >
              {mobileMenuOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#e8e1d2] py-3 space-y-1">
              {[
                ['overview', 'Overview'],
                ['jobs', 'Call Rate Jobs'], 
                ['wallet', 'Wallet'],
                ['profile', 'Profile'],
                [
                  'notifications',
                  'Notifications',
                ],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    goToTab(
                      key as DashboardTab
                    )
                  }
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#f8f4e8] hover:text-[#a47c00]"
                >
                  {label}

                  {key ===
                    'notifications' &&
                    unreadNotifications >
                      0 && (
                      <span className="ml-2 text-xs text-red-500">
                        ({unreadNotifications})
                      </span>
                    )}
                </button>
              ))}

              <button
                onClick={logout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3">
            <AlertCircle
              size={18}
              className="shrink-0 mt-0.5"
            />

            <div className="flex-1 text-sm">
              {error}
            </div>

            <button
              onClick={() =>
                setError('')
              }
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* TOP PROFILE */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl text-white p-5 md:p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-extrabold">
                  {getInitials(
                    technician.full_name
                  )}
                </div>

                <div>
                  <p className="text-white/80 text-sm">
                    Welcome back,
                  </p>

                  <h1 className="text-2xl font-extrabold">
                    {technician.full_name}
                  </h1>

                  {technician.employee_id && (
                    <span className="inline-block mt-1 px-2.5 py-1 rounded-lg bg-white/20 border border-white/30 text-xs font-extrabold tracking-wide">
                      {technician.employee_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} />
                  {technician.city}
                  {technician.area
                    ? ` • ${technician.area}`
                    : ''}
                </span>

                <span className="flex items-center gap-1.5">
                  <Briefcase size={16} />
                  {technician.service_categories
                    ?.length || 0}{' '}
                  Services
                </span>

                <span className="flex items-center gap-1.5">
                  <Star
                    size={16}
                    fill="currentColor"
                  />
                  {Number(
                    technician.rating || 0
                  ).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={() =>
                  setOnlineStatus(
                    !isOnline
                  )
                }
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm ${
                  isOnline
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline
                      ? 'bg-white'
                      : 'bg-white/60'
                  }`}
                />
                {isOnline
                  ? 'Online'
                  : 'Offline'}
              </button>

              <button
                onClick={() =>
                  loadDashboard(false)
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl font-bold text-sm"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <PushNotificationSetup userType="technician" userId={technician.id} />

        {/* STATUS */}
        {technician.status !==
          'active' && (
          <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-amber-600 mt-0.5"
            />

            <div>
              <p className="font-bold text-amber-800">
                Account Status:{' '}
                {technician.status}
              </p>

              <p className="text-sm text-amber-700 mt-1">
                Your account is not currently
                active for normal job assignments.
                Please wait for Admin approval or
                contact VATTAMS support.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <Overview
            technician={technician}
            jobs={jobs}
            activeJobs={activeJobs}
            completedJobs={
              completedJobs
            }
            totalJobEarnings={
              totalJobEarnings
            }
            profileScore={
              profileScore
            }
            unreadNotifications={
              unreadNotifications
            }
            onJobs={() =>
              goToTab('jobs')
            }
            onWallet={() =>
              goToTab('wallet')
            }
            onNotifications={() =>
              goToTab(
                'notifications'
              )
            }
            updateJobStatus={
              updateJobStatus
            }
            processingJob={
              processingJob
            }
          />
        )}

        {activeTab === 'jobs' && (
          <JobsSection
            jobs={jobs}
            updateJobStatus={
              updateJobStatus
            }
            processingJob={
              processingJob
            }
          />
        )}

        {activeTab === 'wallet' && (
          <WalletSection
            technician={technician}
            transactions={
              transactions
            }
            recharges={recharges}
            rechargeAmount={
              rechargeAmount
            }
            setRechargeAmount={
              setRechargeAmount
            }
            paymentRef={paymentRef}
            setPaymentRef={
              setPaymentRef
            }
            submitRecharge={
              submitRecharge
            }
            rechargeSubmitting={
              rechargeSubmitting
            }
            rechargeMessage={
              rechargeMessage
            }
            pendingRecharge={
              pendingRecharge
            }
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSection
            technician={technician}
            profileScore={
              profileScore
            }
          />
        )}

        {activeTab ===
          'notifications' && (
          <NotificationsSection
            notifications={
              mergedNotifications
            }
            markRead={
              markNotificationRead
            }
            markAllRead={
              markAllNotificationsRead
            }
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function Overview({
  technician,
  jobs,
  activeJobs,
  completedJobs,
  totalJobEarnings,
  profileScore,
  unreadNotifications,
  onJobs,
  onWallet,
  onNotifications,
  updateJobStatus,
  processingJob,
}: {
  technician: Technician;
  jobs: TechnicianJob[];
  activeJobs: TechnicianJob[];
  completedJobs: TechnicianJob[];
  totalJobEarnings: number;
  profileScore: number;
  unreadNotifications: number;
  onJobs: () => void;
  onWallet: () => void;
  onNotifications: () => void;
  updateJobStatus: (
    job: TechnicianJob,
    status:
      | 'accepted'
      | 'rejected'
      | 'on_the_way'
      | 'in_progress'
      | 'job_started'
      | 'job_completed'
  ) => Promise<void>;
  processingJob: string | null;
}) {
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* PROMINENT CALL RATE JOBS MESSAGE */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071426] via-[#102744] to-[#071426] border border-[#c9a227]/35 p-6 md:p-8 text-white shadow-xl shadow-[#071426]/15">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-[#c9a227]/20" />
        <div className="absolute -right-4 -top-8 h-32 w-32 rounded-full border border-[#c9a227]/15" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#c9a227]/15 border border-[#c9a227]/35 flex items-center justify-center shrink-0">
              <Phone size={23} className="text-[#f0d681]" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-[#f0d681]">VATTAMS Technician Network</p>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-1">CALL RATE JOBS</h2>
              <p className="text-sm md:text-base leading-6 text-white/75 mt-2 max-w-2xl">Receive eligible service requests for AC, washing machines and refrigerators. Manage assigned jobs, customer details, job status and eligible earnings from your dashboard.</p>
            </div>
          </div>
          <button onClick={onJobs} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e7c75f] hover:bg-[#f0d681] text-[#071426] px-5 py-3 font-extrabold text-sm shadow-lg shadow-black/15 shrink-0">
            View Call Rate Jobs <ChevronRight size={17} />
          </button>
        </div>
        <div className="relative mt-5 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">The fixed fee for each job is shown on its card and is charged only after completion. Job volume and earnings are not guaranteed.</div>
      </section>
      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          title="Total Jobs"
          value={String(
            technician.total_jobs ||
              jobs.length
          )}
          subtitle={`${activeJobs.length} active`}
        />

        <StatCard
          icon={CheckCircle}
          title="Completed"
          value={String(
            technician.completed_jobs_count ||
              completedJobs.length
          )}
          subtitle="Successfully completed"
        />

        <StatCard
          icon={Wallet}
          title="Available Balance"
          value={formatMoney(
            technician.available_balance
          )}
          subtitle="Wallet balance"
        />

        <StatCard
          icon={Star}
          title="Rating"
          value={Number(
            technician.rating || 0
          ).toFixed(1)}
          subtitle={`${technician.acceptance_rate || 0}% acceptance`}
        />
      </div>

      {/* SECONDARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#e8e1d2] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">
                Profile Completeness
              </p>

              <p className="text-2xl font-extrabold text-[#a47c00] mt-1">
                {profileScore}%
              </p>
            </div>

            <User
              size={24}
              className="text-[#b08b18]"
            />
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a227] rounded-full"
              style={{
                width: `${Math.min(
                  profileScore,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e1d2] p-5">
          <p className="text-sm text-gray-500">
            Total Earnings
          </p>

          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {formatMoney(
              totalJobEarnings || technician.earnings || 0
            )}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            After the fixed call-rate fee
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e1d2] p-5">
          <p className="text-sm text-gray-500">
            Notifications
          </p>

          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {unreadNotifications}
          </p>

          <button
            onClick={onNotifications}
            className="text-xs text-[#a47c00] font-bold mt-1"
          >
            View notifications →
          </button>
        </div>
      </div>

      {/* ACTIVE JOBS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              Active Jobs
            </h2>

            <p className="text-sm text-gray-500">
              Jobs currently assigned to you
            </p>
          </div>

          <button
            onClick={onJobs}
            className="text-sm font-bold text-[#a47c00] flex items-center gap-1"
          >
            View All
            <ChevronRight size={16} />
          </button>
        </div>

        {activeJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active jobs"
            description="New eligible service requests will appear here."
          />
        ) : (
          <div className="space-y-3">
            {activeJobs
              .slice(0, 3)
              .map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  updateJobStatus={
                    updateJobStatus
                  }
                  processingJob={
                    processingJob
                  }
                />
              ))}
          </div>
        )}
      </section>

      {/* RECENT JOBS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              Recent Jobs
            </h2>

            <p className="text-sm text-gray-500">
              Your latest job activity
            </p>
          </div>

          <button
            onClick={onJobs}
            className="text-sm font-bold text-[#a47c00] flex items-center gap-1"
          >
            All Jobs
            <ChevronRight size={16} />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No job history"
            description="Your completed and assigned jobs will appear here."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e1d2] overflow-hidden">
            {recentJobs.map(
              (job, index) => (
                <div
                  key={job.id}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    index !==
                    recentJobs.length -
                      1
                      ? 'border-b border-[#e8e1d2]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#f8f4e8] text-[#a47c00] flex items-center justify-center shrink-0">
                      <Wrench
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        Job #{job.id.slice(
                          0,
                          8
                        )}
                      </p>

                      <p className="text-xs text-gray-500">
                        {formatDateTime(
                          job.assigned_at
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-bold ${
                        JOB_STATUS_CLASSES[
                          job.status
                        ] ||
                        'bg-[#f7f4ed] text-gray-600 border-[#e8e1d2]'
                      }`}
                    >
                      {JOB_STATUS_LABELS[
                        job.status
                      ] ||
                        job.status}
                    </span>

                    {job.job_amount !=
                      null && (
                      <p className="text-sm font-extrabold text-gray-900 mt-1">
                        {formatMoney(
                          job.job_amount
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onJobs}
            className="bg-white border border-[#e8e1d2] rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <Briefcase
              size={22}
              className="text-[#b08b18] mb-3"
            />

            <p className="font-bold text-gray-900">
              View Jobs
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Check assigned jobs and update status.
            </p>
          </button>

          <button
            onClick={onWallet}
            className="bg-white border border-[#e8e1d2] rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <Wallet
              size={22}
              className="text-green-600 mb-3"
            />

            <p className="font-bold text-gray-900">
              Wallet
            </p>

            <p className="text-xs text-gray-500 mt-1">
              View balance, transactions and recharge requests.
            </p>
          </button>

          <button
            onClick={onNotifications}
            className="bg-white border border-[#e8e1d2] rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <Bell
              size={22}
              className="text-[#0b1f3a] mb-3"
            />

            <p className="font-bold text-gray-900">
              Notifications
            </p>

            <p className="text-xs text-gray-500 mt-1">
              View important account and job updates.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e1d2] p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs md:text-sm text-gray-500">
            {title}
          </p>

          <p className="text-xl md:text-2xl font-extrabold text-gray-900 mt-1">
            {value}
          </p>

          <p className="text-[11px] md:text-xs text-gray-400 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[#f8f4e8] text-[#a47c00] flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   JOBS
========================================================= */

function JobsSection({
  jobs,
  updateJobStatus,
  processingJob,
}: {
  jobs: TechnicianJob[];
  updateJobStatus: (
    job: TechnicianJob,
    status:
      | 'accepted'
      | 'rejected'
      | 'on_the_way'
      | 'in_progress'
      | 'job_started'
      | 'job_completed'
  ) => Promise<void>;
  processingJob: string | null;
}) {
  const active = jobs.filter(
    (job) =>
      ![
        'completed',
        'job_completed',
        'rejected',
      ].includes(job.status)
  );

  const history = jobs.filter((job) =>
    [
      'completed',
      'job_completed',
      'rejected',
    ].includes(job.status)
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#071426] via-[#102744] to-[#071426] border border-[#c9a227]/35 p-6 md:p-8 text-white shadow-xl shadow-[#071426]/15">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#c9a227]/15 border border-[#c9a227]/35 flex items-center justify-center">
              <Phone size={23} className="text-[#f0d681]" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-[#f0d681]">Technician Opportunity Network</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-extrabold">Call Rate Jobs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Get eligible AC, washing machine and refrigerator service requests through VATTAMS. Review assigned job details, update progress and track eligible earnings in one place.</p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 sm:min-w-40">
            <p className="text-xs text-white/60">Your job workspace</p>
            <p className="mt-1 text-sm font-bold text-[#f0d681]">Calls • Jobs • Earnings</p>
          </div>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">Job availability depends on service category, service area, profile approval, availability and matching. Jobs are not guaranteed.</p>
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">My Assigned Jobs</h2>
        <p className="text-gray-500 text-sm mt-1">Review call-rate service requests assigned to you and update job progress.</p>
      </div>

      <section>
        <h2 className="font-extrabold text-gray-900 mb-4">
          Active Jobs ({active.length})
        </h2>

        {active.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active jobs"
            description="You don't have any active jobs right now."
          />
        ) : (
          <div className="space-y-4">
            {active.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                updateJobStatus={
                  updateJobStatus
                }
                processingJob={
                  processingJob
                }
                detailed
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-extrabold text-gray-900 mb-4">
          Job History ({history.length})
        </h2>

        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No completed jobs yet"
            description="Your completed job history will appear here."
          />
        ) : (
          <div className="space-y-3">
            {history.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                updateJobStatus={
                  updateJobStatus
                }
                processingJob={
                  processingJob
                }
                detailed
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({
  job,
  updateJobStatus,
  processingJob,
  detailed = false,
}: {
  job: TechnicianJob;
  updateJobStatus: (
    job: TechnicianJob,
    status:
      | 'accepted'
      | 'rejected'
      | 'on_the_way'
      | 'in_progress'
      | 'job_started'
      | 'job_completed'
  ) => Promise<void>;
  processingJob: string | null;
  detailed?: boolean;
}) {
  const processing =
    processingJob === job.id;

  return (
    <div className="bg-white rounded-2xl border border-[#e8e1d2] shadow-sm p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#f8f4e8] text-[#a47c00] flex items-center justify-center shrink-0">
            <Wrench size={22} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-gray-900">
                Job #{job.id.slice(0, 8)}
              </h3>

              <span
                className={`px-2.5 py-1 rounded-full border text-xs font-bold ${
                  JOB_STATUS_CLASSES[
                    job.status
                  ] ||
                  'bg-[#f7f4ed] text-gray-600 border-[#e8e1d2]'
                }`}
              >
                {JOB_STATUS_LABELS[
                  job.status
                ] || job.status}
              </span>
            </div>

            {job.service_type && (
              <p className="text-sm font-semibold text-[#0b1f3a] mt-1">
                Job type: {job.service_type}
              </p>
            )}

            <p className="text-sm text-gray-500 mt-1">
              Assigned:{' '}
              {formatDateTime(
                job.assigned_at
              )}
            </p>

            {job.notes && (
              <div className="mt-3 bg-[#f7f4ed] rounded-xl p-3 text-sm text-gray-600">
                <span className="font-bold">
                  Notes:
                </span>{' '}
                {job.notes}
              </div>
            )}

            {job.offered_commission != null && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <p className="font-semibold text-gray-900">
                  VATTAMS Commission · {formatMoney(Number(job.offered_commission))}
                </p>
                <p className="text-sm text-gray-600">Payable after job completion.</p>
              </div>
            )}
            {job.status === 'completed' && Number(job.offered_commission) > 0 && (
              <CommissionCheckout key={job.id} jobId={job.id} />
            )}
            {job.offered_commission == null && Number(job.call_rate_fee || 0) > 0 && (
              <div className="mt-3 rounded-xl border border-[#c9a227]/35 bg-[#fffaf0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#795d0c]">Fixed call-rate fee</span>
                  <span className="text-sm font-extrabold text-[#0b1f3a]">{formatMoney(Number(job.call_rate_fee))}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-600">The fixed call-rate fee applies only after completion. Rejected, cancelled and uncompleted jobs have no call-rate fee. No percentage commission; customer platform fee and tax are separate checkout components.</p>
              </div>
            )}

            {detailed && (
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarDays
                    size={14}
                  />
                  {formatDate(
                    job.assigned_at
                  )}
                </span>

                {job.completed_at && (
                  <span className="flex items-center gap-1">
                    <CheckCircle
                      size={14}
                    />
                    Completed:{' '}
                    {formatDate(
                      job.completed_at
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:text-right shrink-0">
          {job.job_amount != null && (
            <p className="text-xl font-extrabold text-gray-900">
              {formatMoney(
                job.job_amount
              )}
            </p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            Job amount
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      {![
        'completed',
        'job_completed',
        'rejected',
      ].includes(job.status) && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#e8e1d2]">
          {job.status ===
            'assigned' && (
            <>
              <button
                disabled={processing}
                onClick={() =>
                  updateJobStatus(
                    job,
                    'accepted'
                  )
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
              >
                <CheckCircle
                  size={16}
                />
                Accept Job
              </button>

              <button
                disabled={processing}
                onClick={() =>
                  updateJobStatus(
                    job,
                    'rejected'
                  )
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 rounded-xl text-sm font-bold"
              >
                <XCircle size={16} />
                Reject
              </button>
            </>
          )}

          {job.status ===
            'accepted' && (
            <button
              disabled={processing}
              onClick={() =>
                updateJobStatus(
                  job,
                  'on_the_way'
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0b1f3a] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
            >
              <Navigation
                size={16}
              />
              On the Way
            </button>
          )}

          {job.status ===
            'on_the_way' && (
            <button
              disabled={processing}
              onClick={() =>
                updateJobStatus(
                  job,
                  'in_progress'
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-[#c9a227] hover:bg-[#b08b18] disabled:opacity-50 text-white rounded-xl text-sm font-bold"
            >
              <PlayCircle
                size={16}
              />
              Start Job
            </button>
          )}

          {job.status ===
            'in_progress' && (
            <button
              disabled={processing}
              onClick={() =>
                updateJobStatus(
                  job,
                  'job_started'
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
            >
              <CheckCircle
                size={16}
              />
              Start Job
            </button>
          )}

          {job.status ===
            'job_started' && (
            <button
              disabled={processing}
              onClick={() =>
                updateJobStatus(
                  job,
                  'job_completed'
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
            >
              <CheckCircle
                size={16}
              />
              Mark Completed
            </button>
          )}

          {processing && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <RefreshCw
                size={13}
                className="animate-spin"
              />
              Updating...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   WALLET
========================================================= */

function WalletSection({
  technician,
  transactions,
  recharges,
  rechargeAmount,
  setRechargeAmount,
  paymentRef,
  setPaymentRef,
  submitRecharge,
  rechargeSubmitting,
  rechargeMessage,
  pendingRecharge,
}: {
  technician: Technician;
  transactions: WalletTransaction[];
  recharges: WalletRecharge[];
  rechargeAmount: string;
  setRechargeAmount: (
    value: string
  ) => void;
  paymentRef: string;
  setPaymentRef: (
    value: string
  ) => void;
  submitRecharge: () => Promise<void>;
  rechargeSubmitting: boolean;
  rechargeMessage: string;
  pendingRecharge: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          Wallet
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          Manage your technician wallet and payment transactions.
        </p>
      </div>

      {/* WALLET CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletCard
          title="Available Balance"
          value={formatMoney(
            technician.available_balance
          )}
          icon={Wallet}
        />

        <WalletCard
          title="Wallet Balance"
          value={formatMoney(
            technician.wallet_balance
          )}
          icon={CreditCard}
        />

        <WalletCard
          title="Locked Deposit"
          value={formatMoney(
            technician.locked_deposit
          )}
          icon={IndianRupee}
        />

        <WalletCard
          title="Platform, Tax & Call-Rate Dues"
          value={formatMoney(
            technician.commission_due
          )}
          icon={IndianRupee}
        />
      </div>

      {/* RECHARGE */}
      <section className="bg-white rounded-2xl border border-[#e8e1d2] p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Wallet size={20} />
          </div>

          <div>
            <h2 className="font-extrabold text-gray-900">
              Request Wallet Recharge
            </h2>

            <p className="text-xs text-gray-500">
              Approved payments clear customer platform-fee, tax-remittance and call-rate dues first; any remaining amount becomes wallet credit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="number"
            min="1"
            value={rechargeAmount}
            onChange={(event) =>
              setRechargeAmount(
                event.target.value
              )
            }
            placeholder="Amount"
            className="px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-500"
          />

          <input
            value={paymentRef}
            onChange={(event) =>
              setPaymentRef(
                event.target.value
              )
            }
            placeholder="Payment reference (optional)"
            className="px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-500"
          />

          <button
            onClick={submitRecharge}
            disabled={rechargeSubmitting}
            className="px-5 py-3 bg-[#c9a227] hover:bg-[#b08b18] disabled:opacity-60 text-white font-bold rounded-xl"
          >
            {rechargeSubmitting
              ? 'Submitting...'
              : 'Submit Recharge'}
          </button>
        </div>

        {rechargeMessage && (
          <div className="mt-4 bg-[#f8f4e8] text-orange-700 rounded-xl px-4 py-3 text-sm">
            {rechargeMessage}
          </div>
        )}

        {pendingRecharge > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            Pending recharge requests:{' '}
            <strong>
              {formatMoney(
                pendingRecharge
              )}
            </strong>
          </p>
        )}
      </section>

      {/* TRANSACTIONS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              Recent Transactions
            </h2>

            <p className="text-sm text-gray-500">
              Your latest wallet activity.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No transactions"
            description="Wallet transactions will appear here."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e1d2] overflow-hidden">
            {transactions.map(
              (transaction, index) => {
                const isNeutralLedgerEvent = [
                  'registration_fee',
                  'deposit_lock',
                  'adjustment',
                  'recharge_dues_settlement',
                  'deposit_release',
                  'platform_fee_remittance',
                  'gst_remittance',
                  'call_rate_fee',
                ].includes(transaction.type);
                const positive = transaction.type === 'recharge_credit';

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 flex items-center justify-between gap-4 ${
                      index !==
                      transactions.length -
                        1
                        ? 'border-b border-[#e8e1d2]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isNeutralLedgerEvent
                            ? 'bg-gray-100 text-gray-600'
                            : positive
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {isNeutralLedgerEvent ? (
                          <Wallet size={18} />
                        ) : positive ? (
                          <IndianRupee size={18} />
                        ) : (
                          <CreditCard size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm">
                          {transaction.type
                            .replace(
                              /_/g,
                              ' '
                            )
                            .replace(
                              /\b\w/g,
                              (letter: string) =>
                                letter.toUpperCase()
                            )}
                        </p>

                        <p className="text-xs text-gray-500 truncate">
                          {transaction.description ||
                            'Wallet transaction'}
                        </p>

                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatDateTime(
                            transaction.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-extrabold ${
                          isNeutralLedgerEvent
                            ? 'text-gray-600'
                            : positive
                              ? 'text-green-600'
                              : 'text-red-600'
                        }`}
                      >
                        {isNeutralLedgerEvent
                          ? ''
                          : positive
                            ? '+'
                            : '-'}
                        {formatMoney(
                          transaction.amount
                        )}
                      </p>

                      {transaction.balance_after !=
                        null && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Balance:{' '}
                          {formatMoney(
                            transaction.balance_after
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* RECHARGE HISTORY */}
      <section>
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">
          Recharge Requests
        </h2>

        {recharges.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No recharge requests"
            description="Your wallet recharge requests will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recharges.map(
              (recharge) => (
                <div
                  key={recharge.id}
                  className="bg-white rounded-2xl border border-[#e8e1d2] p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-gray-900">
                        {formatMoney(
                          recharge.amount
                        )}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(
                          recharge.created_at
                        )}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 h-fit rounded-full text-xs font-bold ${
                        recharge.status ===
                        'approved'
                          ? 'bg-green-50 text-green-700'
                          : recharge.status ===
                            'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {recharge.status
                        .charAt(0)
                        .toUpperCase() +
                        recharge.status.slice(
                          1
                        )}
                    </span>
                  </div>

                  {recharge.payment_ref && (
                    <p className="text-xs text-gray-500 mt-3">
                      Ref:{' '}
                      <span className="font-semibold">
                        {
                          recharge.payment_ref
                        }
                      </span>
                    </p>
                  )}

                  {recharge.admin_notes && (
                    <p className="text-xs text-gray-500 mt-2">
                      Admin:{' '}
                      {
                        recharge.admin_notes
                      }
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function WalletCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e1d2] p-5">
      <div className="w-10 h-10 rounded-xl bg-[#f8f4e8] text-[#a47c00] flex items-center justify-center mb-3">
        <Icon size={20} />
      </div>

      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="text-xl font-extrabold text-gray-900 mt-1">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfileSection({
  technician,
  profileScore,
}: {
  technician: Technician;
  profileScore: number;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          My Profile
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          View your registered technician information.
        </p>
      </div>

      {/* PROFILE HEADER */}
      <div className="bg-white rounded-2xl border border-[#e8e1d2] p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {technician.profile_photo_url && !photoFailed ? (
            <img
              src={
                technician.profile_photo_url
              }
              alt={
                technician.full_name
              }
              className="w-24 h-24 rounded-2xl object-cover border border-[#e8e1d2]"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-orange-100 text-[#a47c00] flex items-center justify-center text-3xl font-extrabold">
              {getInitials(
                technician.full_name
              )}
            </div>
          )}

          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold text-gray-900">
              {technician.full_name}
            </h2>

            <p className="text-gray-500 mt-1">
              {technician.mobile}
            </p>

            {technician.email && (
              <p className="text-gray-500 text-sm mt-1">
                {technician.email}
              </p>
            )}

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              {technician.employee_id && (
                <span className="px-3 py-1 rounded-full bg-[#f8f4e8] text-[#0b1f3a] text-xs font-extrabold flex items-center gap-1">
                  <BadgeCheck size={12} />
                  {technician.employee_id}
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-[#f8f4e8] text-[#a47c00] text-xs font-bold">
                {technician.status}
              </span>

              <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold flex items-center gap-1">
                <Star
                  size={12}
                  fill="currentColor"
                />
                {Number(
                  technician.rating || 0
                ).toFixed(1)}
              </span>
            </div>

            {technician.employee_id && (
              <button
                onClick={() =>
                  downloadOnboardingLetter({
                    role: 'Technician',
                    employeeId: technician.employee_id!,
                    fullName: technician.full_name,
                    city: technician.city,
                    contactValue: technician.mobile,
                    contactLabel: 'Mobile',
                    email: technician.email,
                    joinedOn: technician.created_at,
                    categoryLabel: 'Service Category(ies)',
                    categoryValue:
                      technician.service_categories?.join(', ') || '—',
                  })
                }
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b1f3a] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                <Download size={13} />
                Download Onboarding Letter
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">
              Profile Completeness
            </span>

            <span className="text-sm font-extrabold text-[#a47c00]">
              {profileScore}%
            </span>
          </div>

          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a227] rounded-full"
              style={{
                width: `${Math.min(
                  profileScore,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* PERSONAL DETAILS */}
      <ProfileCard title="Personal Details">
        <InfoRow
          label="Employee ID"
          value={
            technician.employee_id || 'Not yet assigned'
          }
        />

        <InfoRow
          label="Full Name"
          value={
            technician.full_name
          }
        />

        <InfoRow
          label="Mobile"
          value={
            technician.mobile
          }
        />

        <InfoRow
          label="WhatsApp"
          value={
            technician.whatsapp_number ||
            '—'
          }
        />

        <InfoRow
          label="Email"
          value={
            technician.email ||
            '—'
          }
        />

        <InfoRow
          label="City"
          value={
            technician.city
          }
        />

        <InfoRow
          label="Area"
          value={
            technician.area ||
            '—'
          }
        />

        <InfoRow
          label="PIN Code"
          value={
            technician.pincode ||
            '—'
          }
        />
      </ProfileCard>

      {/* SERVICES */}
      <ProfileCard title="Professional Details">
        <InfoRow
          label="Services"
          value={
            technician.service_categories?.join(
              ', '
            ) || '—'
          }
        />

        <InfoRow
          label="Experience"
          value={`${technician.experience_years || 0} years`}
        />

        <InfoRow
          label="Available Days"
          value={
            technician.available_days?.join(
              ', '
            ) || '—'
          }
        />

        <InfoRow
          label="Working Time"
          value={
            technician.working_time ||
            '—'
          }
        />

        <InfoRow
          label="Vehicle"
          value={
            technician.has_vehicle
              ? 'Yes'
              : 'No'
          }
        />

        <InfoRow
          label="Tools"
          value={
            technician.has_tools
              ? 'Yes'
              : 'No'
          }
        />
      </ProfileCard>

      {/* BANK */}
      <ProfileCard title="Payment Details">
        <InfoRow
          label="Bank Name"
          value={
            technician.bank_name ||
            '—'
          }
        />

        <InfoRow
          label="Account Holder"
          value={
            technician.bank_holder_name ||
            '—'
          }
        />

        <InfoRow
          label="Account Number"
          value={
            technician.bank_account_number
              ? `••••${technician.bank_account_number.slice(
                  -4
                )}`
              : '—'
          }
        />

        <InfoRow
          label="IFSC"
          value={
            technician.bank_ifsc ||
            '—'
          }
        />

        <InfoRow
          label="UPI ID"
          value={
            technician.upi_id ||
            '—'
          }
        />
      </ProfileCard>
    </div>
  );
}

function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e1d2] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e8e1d2]">
        <h2 className="font-extrabold text-gray-900">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-5 py-3.5 flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-gray-900 text-right max-w-[65%]">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsSection({
  notifications,
  markRead,
  markAllRead,
}: {
  notifications: MergedTechNotification[];
  markRead: (
    notification: MergedTechNotification
  ) => Promise<void>;
  markAllRead: () => Promise<void>;
}) {
  const unread = notifications.filter(
    (item) => !item.is_read
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            Notifications
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Important updates about your account and jobs.
          </p>
        </div>

        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-bold text-[#a47c00]"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(
            (notification) => (
              <button
                key={notification.id}
                onClick={() =>
                  markRead(
                    notification
                  )
                }
                className={`w-full text-left bg-white rounded-2xl border p-4 transition-colors ${
                  notification.is_read
                    ? 'border-[#e8e1d2]'
                    : 'border-[#e0d0a8] bg-[#f8f4e8]/40'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f4e8] text-[#a47c00] flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-gray-900">
                        {
                          notification.title
                        }
                      </h3>

                      {!notification.is_read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#c9a227] shrink-0 mt-1.5" />
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {
                        notification.message
                      }
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(
                        notification.created_at
                      )}
                    </p>
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e1d2] p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f7f4ed] text-gray-400 flex items-center justify-center mx-auto mb-4">
        <Icon size={25} />
      </div>

      <h3 className="font-extrabold text-gray-900">
        {title}
      </h3>

      <p className="text-sm text-gray-500 mt-1">
        {description}
      </p>
    </div>
  );
}
function CommissionCheckout({ jobId }: { jobId: string }) {
  interface Payment { status: string; amount: number; upi_id: string; utr: string | null }
  const [checkoutDetails, setCheckoutDetails] = useState<{
    payment: Payment;
    instructions?: { upiLink: string; qr: string };
  } | null>(null);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const note = 'Commission ' + jobId.slice(0, 8);
  const payment = checkoutDetails?.payment;
  const instructions = checkoutDetails?.instructions;

  async function checkout(reference?: string) {
    setBusy(true);
    setError('');
    setCheckoutDetails(null);
    try {
      const result = await technicianData<{ payment: Payment }>('commission_checkout', {
        job_id: jobId, ...(reference ? { utr: reference } : {}),
      });
      const payment = result?.payment;
      if (!payment || !['pending', 'success'].includes(payment.status)) {
        throw new Error('Commission payment details are unavailable.');
      }
      if (payment.status === 'pending' && !payment.utr) {
        if (typeof payment.upi_id !== 'string' || !payment.upi_id.trim()) {
          throw new Error('The commission UPI recipient is unavailable.');
        }
        const upiLink = buildUpiLink(payment.amount, note, payment.upi_id);
        const qr = await generateUpiQrCode(payment.amount, note, payment.upi_id);
        setCheckoutDetails({ payment, instructions: { upiLink, qr } });
      } else {
        setCheckoutDetails({ payment });
        setUtr('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open commission checkout.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="my-2 rounded-xl border border-orange-200 p-3">
      <button type="button" disabled={busy} onClick={() => void checkout()}
        className="font-semibold text-orange-800 disabled:opacity-50">
        {busy ? 'Checking commission status…' : payment ? 'Refresh commission status' : 'Pay Commission'}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {payment?.status === 'success' && <p>Commission paid</p>}
      {payment?.status === 'pending' && payment.utr && <p>Awaiting Admin verification</p>}
      {instructions && !busy && (
        <form onSubmit={event => { event.preventDefault(); void checkout(utr.trim().toUpperCase()); }}>
          <img width={180} height={180} src={instructions.qr} alt="VATTAMS commission payment QR" />
          <a className="block font-semibold text-blue-800" href={instructions.upiLink}>Open UPI App</a>
          <label className="mt-2 block text-sm">
            UPI transaction reference
            <input className="block w-full rounded-lg border p-2" value={utr} required minLength={6}
              maxLength={32} pattern="[A-Za-z0-9]{6,32}" onChange={event => setUtr(event.target.value)} />
          </label>
          <button className="mt-2 rounded-lg bg-orange-100 p-2 font-semibold" disabled={busy}>Submit for verification</button>
        </form>
      )}
    </section>
  );
}
