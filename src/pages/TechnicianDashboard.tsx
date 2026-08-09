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
} from 'lucide-react';

import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';

import type {
  Technician,
  TechnicianJob,
  WalletTransaction,
  WalletRecharge,
  TechnicianNotification,
} from '@/lib/supabase';

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

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(
        notificationChannel
      );
    };
  }, [technician?.id]);

  const unreadNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [notifications]
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

  const update