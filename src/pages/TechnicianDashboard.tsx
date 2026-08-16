import { useEffect, useMemo, useState } from 'react';
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

import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { downloadOnboardingLetter } from '@/lib/onboardingLetter';
import {
  fetchNotifications as fetchJobNotifications,
  markAsRead as markJobNotificationRead,
  markAllAsRead as markAllJobNotificationsRead,
  subscribeToNotifications,
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
  job_completed: 'Job Completed',
  completed: 'Completed',
  rejected: 'Rejected',
};

const JOB_STATUS_CLASSES: Record<string, string> = {
  assigned: 'bg-blue-50 text-blue-700 border-blue-100',
  accepted: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  on_the_way: 'bg-purple-50 text-purple-700 border-purple-100',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-100',
  job_started: 'bg-orange-50 text-orange-700 border-orange-100',
  job_completed: 'bg-green-50 text-green-700 border-green-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatMoney(value?: number | null) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
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
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [recharges, setRecharges] = useState<WalletRecharge[]>([]);
  const [notifications, setNotifications] = useState<
    TechnicianNotification[]
  >([]);
  const [jobNotifications, setJobNotifications] = useState<
    NotificationRow[]
  >([]);

  const [activeTab, setActiveTab] =
    useState<DashboardTab>('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [processingJob, setProcessingJob] = useState<string | null>(null);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [rechargeSubmitting, setRechargeSubmitting] =
    useState(false);
  const [rechargeMessage, setRechargeMessage] = useState('');

  /*
   * Find technician.
   *
   * Supported sessionStorage keys:
   * - vattams_technician_id
   * - technician_id
   * - vattams_technician_mobile
   * - technician_mobile
   *
   * This also tries Supabase auth if an auth session exists.
   */
  const findTechnician = async () => {
    setError('');

    const storedId =
      sessionStorage.getItem('vattams_technician_id') ||
      sessionStorage.getItem('technician_id');

    const storedMobile =
      sessionStorage.getItem('vattams_technician_mobile') ||
      sessionStorage.getItem('technician_mobile');

    if (storedId) {
      const { data, error: technicianError } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', storedId)
        .maybeSingle();

      if (technicianError) {
        throw new Error(technicianError.message);
      }

      if (data) {
        return data as Technician;
      }
    }

    if (storedMobile) {
      const { data, error: technicianError } = await supabase
        .from('technicians')
        .select('*')
        .eq('mobile', storedMobile)
        .maybeSingle();

      if (technicianError) {
        throw new Error(technicianError.message);
      }

      if (data) {
        sessionStorage.setItem(
          'vattams_technician_id',
          data.id
        );

        return data as Technician;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      const { data, error: technicianError } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!technicianError && data) {
        sessionStorage.setItem(
          'vattams_technician_id',
          data.id
        );

        return data as Technician;
      }
    }

    return null;
  };

  const loadDashboard = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError('');

    try {
      const tech = await findTechnician();

      if (!tech) {
        setTechnician(null);
        setJobs([]);
        setTransactions([]);
        setRecharges([]);
        setNotifications([]);

        setError(
          'Technician account could not be found. Please login again.'
        );

        return;
      }

      setTechnician(tech);

      const [
        jobsResult,
        transactionsResult,
        rechargesResult,
        notificationsResult,
        jobNotificationsData,
      ] = await Promise.all([
        supabase
          .from('technician_jobs')
          .select('*')
          .eq('technician_id', tech.id)
          .order('assigned_at', {
            ascending: false,
          }),

        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('technician_id', tech.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(20),

        supabase
          .from('wallet_recharges')
          .select('*')
          .eq('technician_id', tech.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(10),

        supabase
          .from('technician_notifications')
          .select('*')
          .eq('technician_id', tech.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(30),

        fetchJobNotifications('technician', tech.id, 30),
      ]);

      if (jobsResult.error) {
        console.error(
          'Jobs error:',
          jobsResult.error
        );
      }

      if (transactionsResult.error) {
        console.error(
          'Transactions error:',
          transactionsResult.error
        );
      }

      if (rechargesResult.error) {
        console.error(
          'Recharges error:',
          rechargesResult.error
        );
      }

      if (notificationsResult.error) {
        console.error(
          'Notifications error:',
          notificationsResult.error
        );
      }

      setJobs(
        (jobsResult.data || []) as TechnicianJob[]
      );

      setTransactions(
        (transactionsResult.data ||
          []) as WalletTransaction[]
      );

      setRecharges(
        (rechargesResult.data ||
          []) as WalletRecharge[]
      );

      setNotifications(
        (notificationsResult.data ||
          []) as TechnicianNotification[]
      );

      setJobNotifications(jobNotificationsData);
    } catch (err: any) {
      console.error(
        'Technician dashboard error:',
        err
      );

      setError(
        err?.message ||
          'Unable to load technician dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);
  }, []);

  /*
   * Realtime refresh for technician jobs and notifications.
   */
  useEffect(() => {
    if (!technician?.id) return;

    const jobsChannel = supabase
      .channel(
        `technician-jobs-${technician.id}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_jobs',
          filter: `technician_id=eq.${technician.id}`,
        },
        () => {
          loadDashboard(false);
        }
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(
        `technician-notifications-${technician.id}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_notifications',
          filter: `technician_id=eq.${technician.id}`,
        },
        () => {
          loadDashboard(false);
        }
      )
      .subscribe();

    const jobNotificationUnsubscribe = subscribeToNotifications(
      'technician',
      technician.id,
      () => {
        loadDashboard(false);
      }
    );

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(
        notificationChannel
      );
      if (jobNotificationUnsubscribe) jobNotificationUnsubscribe();
    };
  }, [technician?.id]);

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
      jobs.filter((job) =>
        [
          'completed',
          'job_completed',
        ].includes(job.status)
      ),
    [jobs]
  );

  const totalJobEarnings = useMemo(
    () =>
      completedJobs.reduce(
        (total, job) =>
          total + Number(job.job_amount || 0),
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

  const setOnlineStatus = async (
    online: boolean
  ) => {
    if (!technician) return;

    try {
      const { data, error: updateError } =
        await supabase
          .from('technicians')
          .update({
            is_online: online,
            last_active_at:
              new Date().toISOString(),
          })
          .eq('id', technician.id)
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      setTechnician(
        data as Technician
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          'Unable to update online status.'
      );
    }
  };

  const updateJobStatus = async (
    job: TechnicianJob,
    status:
      | 'accepted'
      | 'rejected'
      | 'on_the_way'
      | 'in_progress'
      | 'job_started'
      | 'job_completed'
      | 'completed'
  ) => {
    if (!technician) return;

    setProcessingJob(job.id);
    setError('');

    try {
      const updateData: Record<
        string,
        any
      > = {
        status,
      };

      if (status === 'completed' || status === 'job_completed') {
        updateData.completed_at =
          new Date().toISOString();
      }

      const { error: updateError } =
        await supabase
          .from('technician_jobs')
          .update(updateData)
          .eq('id', job.id)
          .eq(
            'technician_id',
            technician.id
          );

      if (updateError) {
        throw updateError;
      }

      await loadDashboard(false);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          'Unable to update job status.'
      );
    } finally {
      setProcessingJob(null);
    }
  };

  const markNotificationRead = async (
    notification: MergedTechNotification
  ) => {
    if (notification.is_read) return;

    try {
      if (notification._source === 'job') {
        await markJobNotificationRead(notification.id);
        setJobNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );
        return;
      }

      await supabase
        .from('technician_notifications')
        .update({
          is_read: true,
        })
        .eq('id', notification.id);

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
        await Promise.all([
          supabase
            .from('technician_notifications')
            .update({
              is_read: true,
            })
            .eq(
              'technician_id',
              technician.id
            ),
          markAllJobNotificationsRead('technician', technician.id),
        ]);

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

    const amount = Number(
      rechargeAmount
    );

    if (!amount || amount <= 0) {
      setRechargeMessage(
        'Please enter a valid amount.'
      );
      return;
    }

    setRechargeSubmitting(true);
    setRechargeMessage('');

    try {
      const { error: insertError } =
        await supabase
          .from('wallet_recharges')
          .insert({
            technician_id:
              technician.id,
            amount,
            status: 'pending',
            payment_ref:
              paymentRef.trim() || null,
          });

      if (insertError) {
        throw insertError;
      }

      setRechargeAmount('');
      setPaymentRef('');

      setRechargeMessage(
        'Recharge request submitted successfully. Admin will review it.'
      );

      await loadDashboard(false);
    } catch (err: any) {
      console.error(err);

      setRechargeMessage(
        err?.message ||
          'Unable to submit recharge request.'
      );
    } finally {
      setRechargeSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out error.
    }

    sessionStorage.removeItem(
      'vattams_technician_id'
    );
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <RefreshCw
              size={26}
              className="text-orange-500 animate-spin"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
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
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
          >
            Go to Technician Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-20 md:top-24 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-extrabold">
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
                    <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-bold">
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
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
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
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Jobs
              </button>

              <button
                onClick={() =>
                  goToTab('wallet')
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === 'wallet'
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
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
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
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
                className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50"
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
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              {mobileMenuOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
              {[
                ['overview', 'Overview'],
                ['jobs', 'Jobs'],
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
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-600"
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
      | 'completed'
  ) => Promise<void>;
  processingJob: string | null;
}) {
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">
                Profile Completeness
              </p>

              <p className="text-2xl font-extrabold text-orange-600 mt-1">
                {profileScore}%
              </p>
            </div>

            <User
              size={24}
              className="text-orange-500"
            />
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{
                width: `${Math.min(
                  profileScore,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">
            Total Earnings
          </p>

          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {formatMoney(
              technician.earnings ||
                totalJobEarnings
            )}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            From completed jobs
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">
            Notifications
          </p>

          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {unreadNotifications}
          </p>

          <button
            onClick={onNotifications}
            className="text-xs text-orange-600 font-bold mt-1"
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
            className="text-sm font-bold text-orange-600 flex items-center gap-1"
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
            className="text-sm font-bold text-orange-600 flex items-center gap-1"
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
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {recentJobs.map(
              (job, index) => (
                <div
                  key={job.id}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    index !==
                    recentJobs.length -
                      1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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
                        'bg-gray-50 text-gray-600 border-gray-100'
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
            className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <Briefcase
              size={22}
              className="text-orange-500 mb-3"
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
            className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
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
            className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <Bell
              size={22}
              className="text-blue-600 mb-3"
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
  icon: any;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
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

        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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
      | 'completed'
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
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          My Jobs
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          Manage assigned jobs and update job progress.
        </p>
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
      | 'completed'
  ) => Promise<void>;
  processingJob: string | null;
  detailed?: boolean;
}) {
  const processing =
    processingJob === job.id;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}
              >
                {JOB_STATUS_LABELS[
                  job.status
                ] || job.status}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              Assigned:{' '}
              {formatDateTime(
                job.assigned_at
              )}
            </p>

            {job.notes && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                <span className="font-bold">
                  Notes:
                </span>{' '}
                {job.notes}
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
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
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
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
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
          icon={ShieldIcon}
        />

        <WalletCard
          title="Commission Due"
          value={formatMoney(
            technician.commission_due
          )}
          icon={IndianRupee}
        />
      </div>

      {/* RECHARGE */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Wallet size={20} />
          </div>

          <div>
            <h2 className="font-extrabold text-gray-900">
              Request Wallet Recharge
            </h2>

            <p className="text-xs text-gray-500">
              Submit a recharge request for Admin approval.
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
            className="px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl"
          >
            {rechargeSubmitting
              ? 'Submitting...'
              : 'Submit Recharge'}
          </button>
        </div>

        {rechargeMessage && (
          <div className="mt-4 bg-orange-50 text-orange-700 rounded-xl px-4 py-3 text-sm">
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
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {transactions.map(
              (transaction, index) => {
                const positive = [
                  'recharge_credit',
                  'deposit_release',
                  'adjustment',
                ].includes(
                  transaction.type
                );

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 flex items-center justify-between gap-4 ${
                      index !==
                      transactions.length -
                        1
                        ? 'border-b border-gray-100'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          positive
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {positive ? (
                          <IndianRupee
                            size={18}
                          />
                        ) : (
                          <CreditCard
                            size={18}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm">
                          {transaction.type
                            .replaceAll(
                              '_',
                              ' '
                            )
                            .replace(
                              /\b\w/g,
                              (letter) =>
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
                          positive
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {positive
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
                  className="bg-white rounded-2xl border border-gray-100 p-4"
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
  icon: any;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
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

function ShieldIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <ShieldIconInner size={size} />
  );
}

function ShieldIconInner({
  size,
}: {
  size: number;
}) {
  return (
    <span className="font-extrabold">
      ₹
    </span>
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {technician.profile_photo_url && !photoFailed ? (
            <img
              src={
                technician.profile_photo_url
              }
              alt={
                technician.full_name
              }
              className="w-24 h-24 rounded-2xl object-cover border border-gray-100"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-extrabold">
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
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold flex items-center gap-1">
                  <BadgeCheck size={12} />
                  {technician.employee_id}
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold">
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
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
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

            <span className="text-sm font-extrabold text-orange-600">
              {profileScore}%
            </span>
          </div>

          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
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
            className="text-sm font-bold text-orange-600"
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
                    ? 'border-gray-100'
                    : 'border-orange-200 bg-orange-50/40'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
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
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-4">
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