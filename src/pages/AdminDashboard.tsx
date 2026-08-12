import { useState, useEffect, useMemo } from 'react';
import {
  Loader, Calendar, User, Phone, MapPin, Wrench, DollarSign, TrendingUp,
  CheckCircle, Clock, X, ChevronDown, LogOut, LayoutDashboard, Users, Briefcase,
  Trash2, Eye, XCircle, Star, Award, Wallet, Lock, Unlock, History, ShieldCheck,
  CreditCard, LucideIcon, Globe, Facebook, Instagram, Twitter, Youtube, MessageCircle, Save,
  Bell, BellOff, Search, FileText, Tag, Sparkles, Send, BarChart3, Brain,
  RefreshCw,
} from 'lucide-react';
import { supabase, SUPABASE_URL, Booking, Technician, BookingStatus, WalletTransaction, WalletRecharge } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { fetchAllPayments, fetchPendingPayments, updatePaymentStatus, PaymentRecord } from '@/lib/payments';
import { fetchAllServicePrices, getPricingFromServicePrice, formatINR, type PricingBreakdown } from '@/lib/pricing';
import { ServicePrice } from '@/lib/supabase';
import { fetchSiteSettings, saveSiteSettings, validateSettings, SiteSettings, SiteSettingsInput } from '@/lib/siteSettings';
import { refreshSocialLinksCache } from '@/components/SocialLinks';
import NotificationCenter from '@/components/NotificationCenter';
import {
  notifyCustomer, notifyTechnician, notifyAdmin,
  sendAnnouncementToTechnicians, sendAnnouncementToCustomers,
  fetchNotifications, NotificationRow,
} from '@/lib/notifications';
import { Customer } from '@/lib/supabase';
import { fetchAllReminders, type CRMReminder } from '@/lib/crm';
import { generateSocialContent, generateBlogPost, generateCityPage, generateFAQ, generateOfferPoster, saveContentDraft, fetchContentDrafts, type ContentDraft } from '@/lib/aiContent';
import { fetchActiveCoupons, validateCoupon, type Coupon } from '@/lib/coupons';
import { autoAssignTechnician } from '@/lib/aiAssignment';
import AdminAIDashboard from '@/components/admin/AdminAIDashboard';
import AdminCRM from '@/components/admin/AdminCRM';
import AdminContent from '@/components/admin/AdminContent';
import AdminCoupons from '@/components/admin/AdminCoupons';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  assigned: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  accepted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  on_the_way: 'bg-sky-100 text-sky-700 border-sky-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  job_started: 'bg-violet-100 text-violet-700 border-violet-200',
  job_completed: 'bg-teal-100 text-teal-700 border-teal-200',
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
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const statusOptions: BookingStatus[] = [
  'pending',
  'confirmed',
  'assigned',
  'accepted',
  'on_the_way',
  'in_progress',
  'job_started',
  'job_completed',
  'completed',
  'cancelled',
];

type Tab =
  | 'bookings'
  | 'technicians'
  | 'customers'
  | 'wallet'
  | 'payments'
  | 'reports'
  | 'social'
  | 'notifications'
  | 'pricing'
  | 'ai-dashboard'
  | 'crm'
  | 'content'
  | 'coupons';

export default function AdminDashboard() {
  const { navigate } = useRouter();

  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] =
    useState<'all' | BookingStatus>('all');

  const [techFilter, setTechFilter] =
    useState<
      'all' |
      'pending' |
      'active' |
      'inactive' |
      'rejected' |
      'suspended'
    >('all');

  const [refreshing, setRefreshing] =
    useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [selectedTech, setSelectedTech] =
    useState<Technician | null>(null);

  const [assignTechId, setAssignTechId] =
    useState('');

  const [updating, setUpdating] =
    useState(false);

  const [techUpdating, setTechUpdating] =
    useState(false);

  const [walletTxns, setWalletTxns] =
    useState<WalletTransaction[]>([]);

  const [recharges, setRecharges] =
    useState<
      (WalletRecharge & {
        technician_name?: string;
      })[]
    >([]);

  const [walletUpdating, setWalletUpdating] =
    useState(false);

  const [selectedWalletTech, setSelectedWalletTech] =
    useState<Technician | null>(null);

  const [payments, setPayments] =
    useState<PaymentRecord[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customerFilter, setCustomerFilter] =
    useState('');

  const [paymentFilter, setPaymentFilter] =
    useState<
      'all' |
      'pending' |
      'success' |
      'failed'
    >('pending');

  const [paymentUpdating, setPaymentUpdating] =
    useState(false);

  const [siteSettings, setSiteSettings] =
    useState<SiteSettings | null>(null);

  const [socialForm, setSocialForm] =
    useState<SiteSettingsInput>({
      google_business_url: '',
      facebook_url: '',
      instagram_url: '',
      twitter_url: '',
      youtube_url: '',
      whatsapp_number: '',
      website_url: '',
    });

  const [socialErrors, setSocialErrors] =
    useState<Record<string, string>>({});

  const [socialSaving, setSocialSaving] =
    useState(false);

  const [socialMsg, setSocialMsg] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);

  const [notifLogs, setNotifLogs] =
    useState<NotificationRow[]>([]);

  const [notifFilter, setNotifFilter] =
    useState<
      'all' |
      'unread' |
      'read'
    >('all');

  const [announcementModal, setAnnouncementModal] =
    useState(false);

  const [announcementTarget, setAnnouncementTarget] =
    useState<
      'technicians' |
      'customers' |
      'individual'
    >('technicians');

  const [announcementTitle, setAnnouncementTitle] =
    useState('');

  const [announcementMsg, setAnnouncementMsg] =
    useState('');

  const [announcementTechId, setAnnouncementTechId] =
    useState('');

  const [announcementSending, setAnnouncementSending] =
    useState(false);

  const [announcementResult, setAnnouncementResult] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);

  const [servicePrices, setServicePrices] =
    useState<ServicePrice[]>([]);

  const [priceSearch, setPriceSearch] =
    useState('');

  const [priceEdits, setPriceEdits] =
    useState<
      Record<
        string,
        {
          base_price: string;
          gst_rate: string;
          platform_fee: string;
          commission_rate: string;
          is_active: boolean;
        }
      >
    >({});

  const [priceSaving, setPriceSaving] =
    useState(false);

  const [priceMsg, setPriceMsg] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      try {
        const adminToken =
          sessionStorage.getItem(
            'vattams_admin'
          );

        const expiresAt =
          sessionStorage.getItem(
            'vattams_admin_expires'
          );

        if (
          !adminToken ||
          (
            expiresAt &&
            new Date(expiresAt) < new Date()
          )
        ) {
          sessionStorage.removeItem(
            'vattams_admin'
          );

          sessionStorage.removeItem(
            'vattams_admin_expires'
          );

          if (mounted) {
            navigate('admin-login');
          }

          return;
        }

        // AdminLogin uses the project's custom
        // admin-auth session system.
        // Do NOT use supabase.auth.getSession()
        // here because admin login does not create
        // a normal Supabase Auth session.

        if (mounted) {
          await loadData();
        }
      } catch (error) {
        console.error(
          '[AdminDashboard] Admin session verification error:',
          error
        );

        sessionStorage.removeItem(
          'vattams_admin'
        );

        sessionStorage.removeItem(
          'vattams_admin_expires'
        );

        if (mounted) {
          navigate('admin-login');
        }
      }
    };

    verifyAdmin();

    // Previously loadData() only ran once on mount, so a technician who
    // registered AFTER the admin opened this page never showed up until
    // a manual full page reload. Poll every 20s so newly-registered
    // technicians (and new bookings) appear without a hard refresh.
    const pollInterval = window.setInterval(() => {
      if (mounted) {
        loadData();
      }
    }, 20000);

    return () => {
      mounted = false;
      window.clearInterval(pollInterval);
    };
  }, []);

  const loadData = async () => {
    // ---- TEMP DIAGNOSTICS (remove once root cause is confirmed) ----
    // NOTE: this project's Supabase client (src/lib/supabase.ts) does NOT
    // read import.meta.env.VITE_SUPABASE_URL — the URL/anon key are
    // hardcoded constants. We log both here so a mismatch between what
    // Vite injected at build time and what the client actually uses is
    // impossible to miss.
    console.log(
      '[ADMIN DEBUG] SUPABASE_URL (actually used by client):',
      SUPABASE_URL
    );
    console.log(
      '[ADMIN DEBUG] import.meta.env.VITE_SUPABASE_URL (NOT used by client, informational only):',
      import.meta.env.VITE_SUPABASE_URL
    );

    const [
      bookingsRes,
      techRes,
      techMinimalRes,
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .order(
          'created_at',
          { ascending: false }
        ),

      supabase
        .from('technicians')
        .select('*')
        .order(
          'created_at',
          { ascending: false }
        ),

      // TEMP: minimal-column query to compare against select('*') and
      // isolate whether a specific column is the problem.
      supabase
        .from('technicians')
        .select('id, full_name, mobile, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }),
    ]);

    if (bookingsRes.error) {
      console.error(
        '[AdminDashboard] bookings query error:',
        bookingsRes.error
      );
    }

    if (techRes.error) {
      console.error(
        '[AdminDashboard] technicians query error:',
        techRes.error
      );
    }

    // ---- TEMP DIAGNOSTICS (remove once root cause is confirmed) ----
    console.log('[ADMIN DEBUG] technicians data (select *):', techRes.data);
    console.log('[ADMIN DEBUG] technicians error (select *):', techRes.error);
    console.log('[ADMIN DEBUG] technicians count (select *):', techRes.data?.length);
    console.log(
      '[ADMIN DEBUG] pending technicians (select *):',
      (techRes.data ?? []).filter((t) => t.status === 'pending')
    );

    console.log('[ADMIN DEBUG] technicians data (minimal select):', techMinimalRes.data);
    console.log('[ADMIN DEBUG] technicians error (minimal select):', techMinimalRes.error);
    console.log('[ADMIN DEBUG] technicians count (minimal select, exact):', techMinimalRes.count);
    if (
      !techRes.error &&
      !techMinimalRes.error &&
      (techRes.data?.length ?? 0) !== (techMinimalRes.data?.length ?? 0)
    ) {
      console.warn(
        '[ADMIN DEBUG] MISMATCH: select(*) returned a different row count than the minimal select — a specific column is likely the problem.'
      );
    }

    console.log(
      '[AdminDashboard] bookings raw:',
      bookingsRes.data
    );

    console.log(
      '[AdminDashboard] technicians raw:',
      techRes.data
    );

    console.log(
      '[AdminDashboard] active technicians for dropdown:',
      (techRes.data ?? []).filter(
        (t) => t.status === 'active'
      )
    );

    setBookings(
      bookingsRes.data ?? []
    );

    setTechnicians(
      techRes.data ?? []
    );

    // TEMP: this logs the array we just PASSED to setTechnicians, not the
    // committed state (React state updates are async, so `technicians` in
    // this closure is still the OLD value here). See the useEffect below
    // for the actual post-commit state.
    console.log(
      '[ADMIN DEBUG] value passed to setTechnicians():',
      techRes.data ?? []
    );

    const [
      txnRes,
      rechargeRes
    ] = await Promise.all([
      supabase
        .from('wallet_transactions')
        .select('*')
        .order(
          'created_at',
          { ascending: false }
        )
        .limit(100),

      supabase
        .from('wallet_recharges')
        .select(
          '*, technician:technicians(full_name)'
        )
        .order(
          'created_at',
          { ascending: false }
        )
        .limit(50),
    ]);

    if (txnRes.error) {
      console.error(
        '[AdminDashboard] wallet_transactions query error:',
        txnRes.error
      );
    }

    if (rechargeRes.error) {
      console.error(
        '[AdminDashboard] wallet_recharges query error:',
        rechargeRes.error
      );
    }

    setWalletTxns(
      txnRes.data ?? []
    );

    setRecharges(
      (rechargeRes.data ?? []).map(
        (r) => ({
          ...r,
          technician_name:
            (r as Record<string, unknown>)
              .technician
              ? (
                  (r as Record<
                    string,
                    { full_name: string }
                  >).technician
                ).full_name
              : undefined,
        })
      )
    );

    const [
      pendingPay,
      allPay,
      custRes
    ] = await Promise.all([
      fetchPendingPayments(),
      fetchAllPayments(),

      supabase
        .from('customers')
        .select('*')
        .order(
          'created_at',
          { ascending: false }
        ),
    ]);

    setPayments(allPay);

    if (custRes.data) {
      setCustomers(
        custRes.data
      );
    }

    if (custRes.error) {
      console.error(
        '[AdminDashboard] customers query error:',
        custRes.error
      );
    }

    await loadSiteSettings();
    await loadNotifLogs();
    await loadServicePrices();

    setLoading(false);
  };

  const loadServicePrices = async () => {
    const prices =
      await fetchAllServicePrices();

    setServicePrices(prices);

    const edits: Record<
      string,
      {
        base_price: string;
        gst_rate: string;
        platform_fee: string;
        commission_rate: string;
        is_active: boolean;
      }
    > = {};

    prices.forEach((p) => {
      edits[p.id] = {
        base_price:
          String(p.base_price),

        gst_rate:
          String(p.gst_rate),

        platform_fee:
          String(p.platform_fee),

        commission_rate:
          String(p.commission_rate),

        is_active:
          p.is_active,
      };
    });

    setPriceEdits(edits);
  };

  const loadNotifLogs = async () => {
    const logs =
      await fetchNotifications(
        'admin',
        'admin',
        100
      );

    setNotifLogs(logs);
  };

  const loadSiteSettings = async () => {
    const s =
      await fetchSiteSettings();

    setSiteSettings(s);

    setSocialForm({
      google_business_url:
        s.google_business_url ?? '',

      facebook_url:
        s.facebook_url ?? '',

      instagram_url:
        s.instagram_url ?? '',

      twitter_url:
        s.twitter_url ?? '',

      youtube_url:
        s.youtube_url ?? '',

      whatsapp_number:
        s.whatsapp_number ?? '',

      website_url:
        s.website_url ?? '',
    });
  };

  const handleSocialSave = async () => {
    setSocialSaving(true);
    setSocialMsg(null);

    const errors =
      validateSettings(
        socialForm
      );

    setSocialErrors(errors);

    if (
      Object.keys(errors).length > 0
    ) {
      setSocialMsg({
        type: 'error',
        text:
          'Please fix the validation errors before saving.',
      });

      setSocialSaving(false);
      return;
    }

    const result =
      await saveSiteSettings(
        socialForm,
        'admin'
      );

    if (result.success) {
      setSocialMsg({
        type: 'success',
        text:
          'Social media links saved successfully!',
      });

      refreshSocialLinksCache();

      await loadSiteSettings();
    } else {
      setSocialMsg({
        type: 'error',
        text:
          result.error ??
          'Failed to save settings.',
      });
    }

    setSocialSaving(false);
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') {
      return bookings;
    }

    return bookings.filter(
      (b) =>
        b.status === filter
    );
  }, [bookings, filter]);

  const filteredTechnicians = useMemo(() => {
    if (techFilter === 'all') {
      return technicians;
    }

    return technicians.filter(
      (t) =>
        t.status === techFilter
    );
  }, [
    technicians,
    techFilter
  ]);

  // TEMP DIAGNOSTICS (remove once root cause is confirmed): this is the
  // only reliable place to see the ACTUAL committed `technicians` state
  // and the resulting `filteredTechnicians` — logging right after
  // setTechnicians() inside loadData() only shows the value that was
  // passed in, not the committed state (React state updates are
  // asynchronous).
  useEffect(() => {
    console.log('[ADMIN DEBUG] current tab:', tab);
    console.log('[ADMIN DEBUG] techFilter:', techFilter);
    console.log('[ADMIN DEBUG] technicians state (committed), count:', technicians.length);
    console.log('[ADMIN DEBUG] technicians state (committed):', technicians);
    console.log('[ADMIN DEBUG] filteredTechnicians, count:', filteredTechnicians.length);
    console.log('[ADMIN DEBUG] filteredTechnicians:', filteredTechnicians);
  }, [tab, techFilter, technicians, filteredTechnicians]);

  const stats = useMemo(() => {
    const completedBookings =
      bookings.filter(
        (b) =>
          b.status === 'completed' ||
          b.status === 'job_completed'
      );

    const revenue =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (
            b.total_amount ??
            b.amount ??
            0
          ),
        0
      );

    const totalGST =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (b.gst_amount ?? 0),
        0
      );

    const totalCommission =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (
            b.commission_amount ??
            0
          ),
        0
      );

    const totalPlatformFee =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (
            b.platform_fee ??
            0
          ),
        0
      );

    const techEarnings =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (
            (b.base_price ??
              b.amount ??
              0) -
            (
              b.commission_amount ??
              0
            )
          ),
        0
      );

    return {
      total:
        bookings.length,

      pending:
        bookings.filter(
          (b) =>
            b.status === 'pending'
        ).length,

      assigned:
        bookings.filter(
          (b) =>
            [
              'assigned',
              'accepted'
            ].includes(
              b.status
            )
        ).length,

      inProgress:
        bookings.filter(
          (b) =>
            [
              'on_the_way',
              'in_progress',
              'job_started'
            ].includes(
              b.status
            )
        ).length,

      completed:
        completedBookings.length,

      cancelled:
        bookings.filter(
          (b) =>
            b.status ===
            'cancelled'
        ).length,

      revenue,
      totalGST,
      totalCommission,
      totalPlatformFee,
      techEarnings,

      technicians:
        technicians.filter(
          (t) =>
            t.status ===
            'active'
        ).length,

      pendingTechs:
        technicians.filter(
          (t) =>
            t.status ===
            'pending'
        ).length,
    };
  }, [
    bookings,
    technicians
  ]);

  const updateStatus = async (
    id: string,
    status: BookingStatus
  ) => {
    setUpdating(true);

    await supabase
      .from('bookings')
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        id
      );

    setBookings(
      (prev) =>
        prev.map(
          (b) =>
            b.id === id
              ? {
                  ...b,
                  status,
                }
              : b
        )
    );

    if (
      selectedBooking?.id === id
    ) {
      setSelectedBooking(
        (prev) =>
          prev
            ? {
                ...prev,
                status,
              }
            : prev
      );
    }

    // Send customer notification based on status
    const booking =
      bookings.find(
        (b) => b.id === id
      );

    if (booking) {
      if (
        status ===
        'in_progress'
      ) {
        await notifyCustomer.serviceStarted(
          booking.mobile_number,
          booking.booking_number,
          booking.id
        );
      } else if (
        status ===
        'completed'
      ) {
        await notifyCustomer.serviceCompleted(
          booking.mobile_number,
          booking.booking_number,
          booking.id
        );
      } else if (
        status ===
        'cancelled'
      ) {
        await Promise.all([
          notifyCustomer.bookingCancelled(
            booking.mobile_number,
            booking.booking_number,
            booking.id
          ),

          booking.assigned_technician_id
            ? notifyTechnician.jobCancelled(
                booking.assigned_technician_id,
                booking.booking_number
              )
            : null,
        ]);
      }
    }

    setUpdating(false);
  };

  const assignTechnician = async () => {
    if (
      !selectedBooking ||
      !assignTechId
    ) {
      return;
    }

    setUpdating(true);

    const {
      error: bookErr
    } = await supabase
      .from('bookings')
      .update({
        assigned_technician_id:
          assignTechId,

        status:
          'confirmed',

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        selectedBooking.id
      );

    if (bookErr) {
      console.error(
        '[AdminDashboard] assign booking update error:',
        bookErr
      );
    }

    const {
      data: jobData,
      error: jobErr
    } = await supabase
      .from(
        'technician_jobs'
      )
      .insert({
        booking_id:
          selectedBooking.id,

        technician_id:
          assignTechId,

        status:
          'assigned',
      })
      .select()
      .single();

    if (jobErr) {
      console.error(
        '[AdminDashboard] technician_jobs insert error:',
        jobErr
      );
    }

    const assignedTech =
      technicians.find(
        (t) =>
          t.id ===
          assignTechId
      );

    // Send notifications
    await Promise.all([
      notifyCustomer.technicianAssigned(
        selectedBooking.mobile_number,
        selectedBooking.booking_number,
        assignedTech?.full_name ??
          'A technician',
        selectedBooking.id
      ),

      jobData
        ? notifyTechnician.jobAssigned(
            assignTechId,
            selectedBooking.booking_number,
            jobData.id
          )
        : null,
    ]);

    setBookings(
      (prev) =>
        prev.map(
          (b) =>
            b.id ===
            selectedBooking.id
              ? {
                  ...b,
                  assigned_technician_id:
                    assignTechId,
                  status:
                    'confirmed',
                }
              : b
        )
    );

    setSelectedBooking(null);
    setAssignTechId('');
    setUpdating(false);
  };

  const updateTechStatus = async (
    id: string,
    status:
      | 'active'
      | 'inactive'
      | 'rejected'
      | 'suspended',
    reason?: string
  ) => {
    setTechUpdating(true);

    try {
      const updateData:
        Record<
          string,
          unknown
        > = {
        status,
      };

      if (
        status === 'active'
      ) {
        updateData.rejection_reason =
          null;

        updateData.suspend_reason =
          null;
      } else if (
        status === 'rejected' ||
        status === 'inactive'
      ) {
        updateData.rejection_reason =
          reason || null;
      } else if (
        status === 'suspended'
      ) {
        updateData.suspend_reason =
          reason || null;
      }

      // IMPORTANT: wait for the real database response.
      const {
        data: updatedTech,
        error,
      } = await supabase
        .from('technicians')
        .update(
          updateData
        )
        .eq(
          'id',
          id
        )
        .select('*')
        .single();

      if (error) {
        console.error(
          '[AdminDashboard] technician status update error:',
          error
        );

        throw new Error(
          error.message
        );
      }

      if (!updatedTech) {
        throw new Error(
          'Technician was not updated in the database.'
        );
      }

      console.log(
        '[AdminDashboard] technician status saved:',
        updatedTech.id,
        updatedTech.status
      );

      // Replace the local row with the exact row returned by Supabase.
      setTechnicians(
        (prev) =>
          prev.map(
            (t) =>
              t.id === id
                ? updatedTech
                : t
          )
      );

      if (
        selectedTech?.id === id
      ) {
        setSelectedTech(
          updatedTech
        );
      }

      // Notification happens only after the database update succeeds.
      if (
        status === 'active'
      ) {
        await notifyTechnician.registrationApproved(
          id,
          updatedTech.full_name
        );
      } else if (
        status === 'inactive' ||
        status === 'rejected'
      ) {
        await notifyTechnician.registrationRejected(
          id,
          updatedTech.full_name
        );
      }

      // Final database read: this guarantees the dashboard is showing
      // the persisted value, not just React state.
      const {
        data: freshTech,
        error: refreshError,
      } = await supabase
        .from('technicians')
        .select('*')
        .eq(
          'id',
          id
        )
        .single();

      if (refreshError) {
        console.error(
          '[AdminDashboard] technician refresh error:',
          refreshError
        );
      } else if (
        freshTech
      ) {
        setTechnicians(
          (prev) =>
            prev.map(
              (t) =>
                t.id === id
                  ? freshTech
                  : t
            )
        );

        if (
          selectedTech?.id === id
        ) {
          setSelectedTech(
            freshTech
          );
        }
      }
    } catch (error) {
      console.error(
        '[AdminDashboard] updateTechStatus failed:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to update technician status.'
      );
    } finally {
      setTechUpdating(false);
    }
  };

  const approveRecharge = async (
    rechargeId: string
  ) => {
    setWalletUpdating(true);

    const {
      error
    } = await supabase
      .from(
        'wallet_recharges'
      )
      .update({
        status:
          'approved',

        approved_at:
          new Date().toISOString(),

        approved_by:
          'admin',
      })
      .eq(
        'id',
        rechargeId
      );

    if (error) {
      console.error(
        '[AdminDashboard] recharge approve error:',
        error
      );
    } else {
      setRecharges(
        (prev) =>
          prev.map(
            (r) =>
              r.id ===
              rechargeId
                ? {
                    ...r,
                    status:
                      'approved',

                    approved_at:
                      new Date().toISOString(),
                  }
                : r
          )
      );

      const r =
        recharges.find(
          (x) =>
            x.id ===
            rechargeId
        );

      if (r) {
        await notifyTechnician.walletRechargeApproved(
          r.technician_id,
          Number(
            r.amount
          )
        );

        const {
          data:
            updatedTech
        } = await supabase
          .from(
            'technicians'
          )
          .select('*')
          .eq(
            'id',
            r.technician_id
          )
          .maybeSingle();

        if (
          updatedTech
        ) {
          setTechnicians(
            (prev) =>
              prev.map(
                (t) =>
                  t.id ===
                  updatedTech.id
                    ? updatedTech
                    : t
              )
          );
        }

        const {
          data:
            newTxns
        } = await supabase
          .from(
            'wallet_transactions'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false
            }
          )
          .limit(100);

        if (
          newTxns
        ) {
          setWalletTxns(
            newTxns
          );
        }
      }
    }

    setWalletUpdating(
      false
    );
  };

  const rejectRecharge = async (rechargeId: string) => {
    setWalletUpdating(true);

    const reason =
      window.prompt('Reason for rejecting this recharge (optional):') ?? undefined;

    const { error } = await supabase
      .from('wallet_recharges')
      .update({
        status: 'rejected',
        admin_notes: reason || null,
        approved_at: new Date().toISOString(),
        approved_by: 'admin',
      })
      .eq('id', rechargeId);

    if (error) {
      console.error('[AdminDashboard] recharge reject error:', error);
    } else {
      setRecharges((prev) =>
        prev.map((r) =>
          r.id === rechargeId ? { ...r, status: 'rejected' } : r
        )
      );
    }

    setWalletUpdating(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out error; local admin session is cleared below regardless.
    }

    sessionStorage.removeItem('vattams_admin');
    sessionStorage.removeItem('vattams_admin_email');
    sessionStorage.removeItem('vattams_admin_expires');

    navigate('admin-login');
  };

  const navItems: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'bookings', label: 'Bookings', icon: Briefcase },
    { id: 'technicians', label: 'Technicians', icon: Users },
    { id: 'customers', label: 'Customers', icon: User },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'social', label: 'Social & Website', icon: Globe },
    { id: 'pricing', label: 'Pricing', icon: Tag },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'content', label: 'AI Content', icon: Sparkles },
    { id: 'crm', label: 'CRM', icon: FileText },
    { id: 'ai-dashboard', label: 'AI Insights', icon: Brain },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-100">
        <div className="px-5 py-5 flex items-center gap-2">
          <LayoutDashboard size={22} className="text-blue-600" />
          <span className="font-extrabold text-gray-900">Admin Panel</span>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible px-3 pb-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ' +
                (tab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100')
              }
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 sticky top-0 z-10">
          <h1 className="text-lg font-extrabold text-gray-900 capitalize">
            {tab.replace('-', ' ')}
          </h1>

          <div className="flex items-center gap-3">
            <NotificationCenter recipientType="admin" recipientId="admin" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6">

    {/* ===================== BOOKINGS TAB ===================== */}
    {tab === 'bookings' && (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <MetricCard icon={Briefcase} label="Total" value={String(stats.total)} color="blue" />
          <MetricCard icon={Clock} label="Pending" value={String(stats.pending)} color="amber" />
          <MetricCard icon={Users} label="Assigned" value={String(stats.assigned)} color="purple" />
          <MetricCard icon={TrendingUp} label="In Progress" value={String(stats.inProgress)} color="purple" />
          <MetricCard icon={CheckCircle} label="Completed" value={String(stats.completed)} color="green" />
          <MetricCard icon={XCircle} label="Cancelled" value={String(stats.cancelled)} color="amber" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">Bookings</h2>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | BookingStatus)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{b.booking_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{b.customer_name}</div>
                      <div className="text-xs text-gray-400">{b.mobile_number}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{b.service_category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{b.city}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                          statusColors[b.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700 hidden xl:table-cell">
                      {formatINR(b.total_amount ?? b.amount ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setAssignTechId(b.assigned_technician_id ?? '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ===================== TECHNICIANS TAB ===================== */}
    {tab === 'technicians' && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">Technicians</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-sm font-semibold transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

          <select
            value={techFilter}
            onChange={(e) =>
              setTechFilter(
                e.target.value as
                  | 'all'
                  | 'pending'
                  | 'active'
                  | 'inactive'
                  | 'rejected'
                  | 'suspended'
              )
            }
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Approved</option>
            <option value="inactive">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTechnicians.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.full_name}</div>
                    <div className="text-xs text-gray-400">{t.city}</div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    techStatusColors[t.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {techStatusLabel[t.status] ?? t.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Star size={12} /> {t.rating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1">
                  <Award size={12} /> {t.total_jobs} jobs
                </div>
                <div className="flex items-center gap-1">
                  <Wallet size={12} /> {formatINR(t.wallet_balance)}
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={12} /> {t.mobile}
                </div>
              </div>

              <button
                onClick={() => setSelectedTech(t)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors"
              >
                <Eye size={14} /> View Details
              </button>
            </div>
          ))}

          {filteredTechnicians.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              No technicians found.
            </div>
          )}
        </div>
      </div>
    )}

    {/* ===================== WALLET TAB ===================== */}
    {tab === 'wallet' && (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Recharge Requests</h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Technician</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {recharges.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{r.technician_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatINR(r.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{r.payment_ref ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ' +
                            (r.status === 'approved'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : r.status === 'rejected'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200')
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => approveRecharge(r.id)}
                              disabled={walletUpdating}
                              className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-600 text-xs font-semibold transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectRecharge(r.id)}
                              disabled={walletUpdating}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {recharges.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        No recharge requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Recent Wallet Transactions</h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {walletTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 capitalize">
                        {String(txn.type).replace(/_/g, ' ')}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${
                          txn.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatINR(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{txn.description ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                        {new Date(txn.created_at).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}

                  {walletTxns.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ===================== NOTIFICATIONS TAB ===================== */}
    {tab === 'notifications' && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">Notification Log</h2>

          <div className="flex items-center gap-2">
            <select
              value={notifFilter}
              onChange={(e) => setNotifFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <button
              onClick={() => setAnnouncementModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Send size={16} /> Send Announcement
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {notifLogs
            .filter((n) =>
              notifFilter === 'all' ? true : notifFilter === 'unread' ? !n.is_read : n.is_read
            )
            .map((n) => (
              <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                <div
                  className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                    n.is_read ? 'bg-gray-200' : 'bg-blue-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                  <div className="text-sm text-gray-500">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}

          {notifLogs.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No notifications yet.</div>
          )}
        </div>
      </div>
    )}

    {/* ===================== PAYMENTS TAB ===================== */}
    {tab === 'payments' && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">Payments</h2>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'pending' | 'success' | 'failed')}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
          >
            <option value="pending">Pending</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-amber-500 font-semibold uppercase">Pending</div>
            <div className="text-2xl font-extrabold text-amber-600">
              {payments.filter((p) => p.status === 'pending').length}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-green-500 font-semibold uppercase">
              Successful
            </div>
            <div className="text-2xl font-extrabold text-green-600">
              {payments.filter((p) => p.status === 'success').length}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-red-500 font-semibold uppercase">Failed</div>
            <div className="text-2xl font-extrabold text-red-600">
              {payments.filter((p) => p.status === 'failed').length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Purpose</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">UTR</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {payments
                  .filter((p) => (paymentFilter === 'all' ? true : p.status === paymentFilter))
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-gray-800">{p.payee_name ?? '—'}</div>
                        <div className="text-xs text-gray-400 capitalize">{p.payee_type}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize hidden md:table-cell">
                        {p.purpose.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{formatINR(p.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{p.utr ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ' +
                            (p.status === 'success'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : p.status === 'failed'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200')
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={async () => {
                                setPaymentUpdating(true);
                                await updatePaymentStatus(p.payment_id, 'success', p.utr ?? undefined, 'admin');
                                setPayments(await fetchAllPayments());
                                setPaymentUpdating(false);
                              }}
                              disabled={paymentUpdating}
                              className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-600 text-xs font-semibold transition-colors"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={async () => {
                                setPaymentUpdating(true);
                                await updatePaymentStatus(p.payment_id, 'failed', p.utr ?? undefined, 'admin');
                                setPayments(await fetchAllPayments());
                                setPaymentUpdating(false);
                              }}
                              disabled={paymentUpdating}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-semibold transition-colors"
                            >
                              Mark Failed
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                {payments.filter((p) => (paymentFilter === 'all' ? true : p.status === paymentFilter)).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Booking detail / assign / status modal */}
    {selectedBooking && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setSelectedBooking(null)}
      >
        <div
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-gray-900">
              Booking {selectedBooking.booking_number}
            </h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <InfoRow icon={User} label="Customer" value={selectedBooking.customer_name} />
            <InfoRow icon={Phone} label="Mobile" value={selectedBooking.mobile_number} />
            <InfoRow icon={Wrench} label="Service" value={selectedBooking.service_category} />
            <InfoRow icon={MapPin} label="City" value={selectedBooking.city} />
          </div>

          <div className="mb-5">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
            <div className="text-sm text-gray-700">{selectedBooking.address}</div>
          </div>

          {selectedBooking.problem_description && (
            <div className="mb-5">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem</div>
              <div className="text-sm text-gray-700">{selectedBooking.problem_description}</div>
            </div>
          )}

          <div className="mb-5">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">
              Assign Technician
            </div>
            <div className="flex gap-2">
              <select
                value={assignTechId}
                onChange={(e) => setAssignTechId(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select technician...</option>
                {technicians
                  .filter((t) => t.status === 'active')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.city})
                    </option>
                  ))}
              </select>
              <button
                onClick={assignTechnician}
                disabled={updating || !assignTechId}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Assign
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">
              Update Status
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(selectedBooking.id, s)}
                  disabled={updating}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-colors disabled:opacity-50 ' +
                    (selectedBooking.status === s
                      ? statusColors[s]
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                  }
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Technician detail / approve / reject / suspend modal */}
    {selectedTech && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setSelectedTech(null)}
      >
        <div
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-gray-900">{selectedTech.full_name}</h3>
            <button
              onClick={() => setSelectedTech(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <InfoRow icon={Phone} label="Mobile" value={selectedTech.mobile} />
            <InfoRow icon={MapPin} label="City" value={selectedTech.city} />
            <InfoRow icon={Wrench} label="Experience" value={`${selectedTech.experience_years} yrs`} />
            <InfoRow icon={Star} label="Rating" value={selectedTech.rating.toFixed(1)} />
            <InfoRow icon={Award} label="Total Jobs" value={String(selectedTech.total_jobs)} />
            <InfoRow icon={Wallet} label="Wallet" value={formatINR(selectedTech.wallet_balance)} />
          </div>

          {selectedTech.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => updateTechStatus(selectedTech.id, 'active')}
                disabled={techUpdating}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Reason for rejection (optional):') ?? undefined;
                  updateTechStatus(selectedTech.id, 'rejected', reason);
                }}
                disabled={techUpdating}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-semibold rounded-xl transition-colors"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          )}

          {selectedTech.status === 'active' && (
            <button
              onClick={() => {
                const reason = window.prompt('Reason for suspension (optional):') ?? undefined;
                updateTechStatus(selectedTech.id, 'suspended', reason);
              }}
              disabled={techUpdating}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-600 text-sm font-semibold rounded-xl transition-colors"
            >
              <Lock size={16} /> Suspend
            </button>
          )}

          {(selectedTech.status === 'suspended' ||
            selectedTech.status === 'inactive' ||
            selectedTech.status === 'rejected') && (
            <button
              onClick={() => updateTechStatus(selectedTech.id, 'active')}
              disabled={techUpdating}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Unlock size={16} /> Reactivate
            </button>
          )}
        </div>
      </div>
    )}

    {/* Send announcement modal */}
    {announcementModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setAnnouncementModal(false)}
      >
        <div
          className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-gray-900">Send Announcement</h3>
            <button
              onClick={() => setAnnouncementModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Send To</label>
              <select
                value={announcementTarget}
                onChange={(e) =>
                  setAnnouncementTarget(e.target.value as 'technicians' | 'customers' | 'individual')
                }
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500"
              >
                <option value="technicians">All Technicians</option>
                <option value="customers">All Customers</option>
                <option value="individual">Specific Technician</option>
              </select>
            </div>

            {announcementTarget === 'individual' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Technician</label>
                <select
                  value={announcementTechId}
                  onChange={(e) => setAnnouncementTechId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select technician...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Title</label>
              <input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500"
                placeholder="Announcement title"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Message</label>
              <textarea
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500"
                placeholder="Write your message..."
              />
            </div>

            {announcementResult && (
              <div
                className={
                  'text-sm rounded-xl px-4 py-3 ' +
                  (announcementResult.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700')
                }
              >
                {announcementResult.text}
              </div>
            )}

            <button
              onClick={async () => {
                if (!announcementTitle.trim() || !announcementMsg.trim()) {
                  setAnnouncementResult({
                    type: 'error',
                    text: 'Please enter a title and message.',
                  });
                  return;
                }

                setAnnouncementSending(true);
                setAnnouncementResult(null);

                try {
                  let count = 0;

                  if (announcementTarget === 'technicians') {
                    count = await sendAnnouncementToTechnicians(
                      technicians
                        .filter((t) => t.status === 'active')
                        .map((t) => ({ id: t.id, full_name: t.full_name })),
                      announcementTitle,
                      announcementMsg
                    );
                  } else if (announcementTarget === 'customers') {
                    count = await sendAnnouncementToCustomers(
                      customers.map((c) => c.mobile),
                      announcementTitle,
                      announcementMsg
                    );
                  } else if (announcementTarget === 'individual' && announcementTechId) {
                    count = await sendAnnouncementToTechnicians(
                      technicians
                        .filter((t) => t.id === announcementTechId)
                        .map((t) => ({ id: t.id, full_name: t.full_name })),
                      announcementTitle,
                      announcementMsg
                    );
                  }

                  setAnnouncementResult({
                    type: 'success',
                    text: `Sent to ${count} recipient(s).`,
                  });
                  setAnnouncementTitle('');
                  setAnnouncementMsg('');
                  await loadNotifLogs();
                } catch (err) {
                  setAnnouncementResult({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Failed to send announcement.',
                  });
                }

                setAnnouncementSending(false);
              }}
              disabled={announcementSending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {announcementSending ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send Announcement
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ===================== CUSTOMERS TAB ===================== */}
    {tab === 'customers' && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">
            Customers
          </h2>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-3 text-gray-400"
            />

            <input
              value={customerFilter}
              onChange={(e) =>
                setCustomerFilter(e.target.value)
              }
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Name
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Mobile
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                    Email
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                    City
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {customers
                  .filter((c) => {
                    const q =
                      customerFilter
                        .trim()
                        .toLowerCase();

                    if (!q) return true;

                    return (
                      String(c.full_name ?? '')
                        .toLowerCase()
                        .includes(q) ||
                      String(c.mobile ?? '')
                        .toLowerCase()
                        .includes(q) ||
                      String(c.email ?? '')
                        .toLowerCase()
                        .includes(q) ||
                      String(c.city ?? '')
                        .toLowerCase()
                        .includes(q)
                    );
                  })
                  .map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User
                              size={14}
                              className="text-blue-600"
                            />
                          </div>

                          <span className="text-sm font-semibold text-gray-800">
                            {c.full_name || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.mobile || '—'}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {c.email || '—'}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {c.city || '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                        {c.created_at
                          ? new Date(
                              c.created_at
                            ).toLocaleDateString(
                              'en-IN'
                            )
                          : '—'}
                      </td>
                    </tr>
                  ))}

                {customers.filter((c) => {
                  const q =
                    customerFilter
                      .trim()
                      .toLowerCase();

                  if (!q) return true;

                  return (
                    String(c.full_name ?? '')
                      .toLowerCase()
                      .includes(q) ||
                    String(c.mobile ?? '')
                      .toLowerCase()
                      .includes(q) ||
                    String(c.email ?? '')
                      .toLowerCase()
                      .includes(q) ||
                    String(c.city ?? '')
                      .toLowerCase()
                      .includes(q)
                  );
                }).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-gray-400 text-sm"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ===================== REPORTS TAB ===================== */}
    {tab === 'reports' && (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            Reports & Analytics
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Overview of booking performance and revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard
            icon={Briefcase}
            label="Total Bookings"
            value={stats.total}
          />

          <ReportCard
            icon={CheckCircle}
            label="Completed"
            value={stats.completed}
          />

          <ReportCard
            icon={TrendingUp}
            label="In Progress"
            value={stats.inProgress}
          />

          <ReportCard
            icon={XCircle}
            label="Cancelled"
            value={stats.cancelled}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportMoneyCard
            icon={DollarSign}
            label="Total Revenue"
            value={stats.revenue}
          />

          <ReportMoneyCard
            icon={TrendingUp}
            label="GST Collected"
            value={stats.totalGST}
          />

          <ReportMoneyCard
            icon={Wallet}
            label="Commission"
            value={stats.totalCommission}
          />

          <ReportMoneyCard
            icon={Briefcase}
            label="Technician Earnings"
            value={stats.techEarnings}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            Booking Status Breakdown
          </h3>

          <div className="space-y-3">
            {statusOptions.map((status) => {
              const count =
                bookings.filter(
                  (b) => b.status === status
                ).length;

              const percentage =
                stats.total > 0
                  ? Math.round(
                      (count / stats.total) * 100
                    )
                  : 0;

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </span>

                    <span className="text-xs text-gray-400">
                      {count} ({percentage}%)
                    </span>
                  </div>

                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users
                  size={18}
                  className="text-blue-600"
                />
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium">
                  Active Technicians
                </div>

                <div className="text-xl font-extrabold text-gray-900">
                  {stats.technicians}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock
                  size={18}
                  className="text-amber-600"
                />
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium">
                  Pending Technicians
                </div>

                <div className="text-xl font-extrabold text-gray-900">
                  {stats.pendingTechs}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle
                  size={18}
                  className="text-green-600"
                />
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium">
                  Completion Rate
                </div>

                <div className="text-xl font-extrabold text-gray-900">
                  {stats.total > 0
                    ? `${Math.round(
                        (stats.completed /
                          stats.total) *
                          100
                      )}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ===================== SOCIAL TAB ===================== */}
    {tab === 'social' && (
      <div className="max-w-3xl">
        <div className="mb-6">
          <h2 className="text-lg font-extrabold text-gray-900">
            Social Media & Website
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Manage the social links displayed across the website.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {socialMsg && (
            <div
              className={`mb-5 p-3 rounded-xl text-sm font-medium ${
                socialMsg.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {socialMsg.text}
            </div>
          )}

          <div className="space-y-4">
            <SocialInput
              icon={Globe}
              label="Google Business URL"
              value={socialForm.google_business_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  google_business_url:
                    value,
                }))
              }
              error={
                socialErrors.google_business_url
              }
            />

            <SocialInput
              icon={Facebook}
              label="Facebook URL"
              value={socialForm.facebook_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  facebook_url:
                    value,
                }))
              }
              error={
                socialErrors.facebook_url
              }
            />

            <SocialInput
              icon={Instagram}
              label="Instagram URL"
              value={socialForm.instagram_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  instagram_url:
                    value,
                }))
              }
              error={
                socialErrors.instagram_url
              }
            />

            <SocialInput
              icon={Twitter}
              label="Twitter / X URL"
              value={socialForm.twitter_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  twitter_url:
                    value,
                }))
              }
              error={
                socialErrors.twitter_url
              }
            />

            <SocialInput
              icon={Youtube}
              label="YouTube URL"
              value={socialForm.youtube_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  youtube_url:
                    value,
                }))
              }
              error={
                socialErrors.youtube_url
              }
            />

            <SocialInput
              icon={MessageCircle}
              label="WhatsApp Number"
              value={socialForm.whatsapp_number ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  whatsapp_number:
                    value,
                }))
              }
              error={
                socialErrors.whatsapp_number
              }
            />

            <SocialInput
              icon={Globe}
              label="Website URL"
              value={socialForm.website_url ?? ''}
              onChange={(value) =>
                setSocialForm((prev) => ({
                  ...prev,
                  website_url:
                    value,
                }))
              }
              error={
                socialErrors.website_url
              }
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSocialSave}
              disabled={socialSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {socialSaving ? (
                <Loader
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Save size={16} />
              )}

              {socialSaving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ===================== PRICING TAB ===================== */}
    {tab === 'pricing' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              Service Pricing
            </h2>
            <p className="text-gray-500 text-sm">
              Edit base price, GST, platform fee, and commission for each service.
              Changes take effect immediately for new bookings.
            </p>
          </div>

          {priceMsg && (
            <div
              className={
                'rounded-xl p-3 text-sm ' +
                (priceMsg.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200')
              }
            >
              {priceMsg.text}
            </div>
          )}

          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={priceSearch}
              onChange={(e) => setPriceSearch(e.target.value)}
              placeholder="Search service..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Service
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Base Price
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      GST %
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Platform Fee
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Commission %
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Active
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {servicePrices
                    .filter((p) =>
                      p.service_name
                        .toLowerCase()
                        .includes(priceSearch.toLowerCase())
                    )
                    .map((p) => {
                      const edit =
                        priceEdits[p.id] ?? {
                          base_price: String(p.base_price),
                          gst_rate: String(p.gst_rate),
                          platform_fee: String(p.platform_fee),
                          commission_rate: String(p.commission_rate),
                          is_active: p.is_active,
                        };

                      const breakdown: PricingBreakdown =
                        getPricingFromServicePrice({
                          ...p,
                          base_price:
                            Number(edit.base_price) || 0,
                          gst_rate:
                            Number(edit.gst_rate) || 0,
                          platform_fee:
                            Number(edit.platform_fee) || 0,
                          commission_rate:
                            Number(edit.commission_rate) || 0,
                        });

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                            {p.service_name}
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={edit.base_price}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...edit,
                                    base_price: e.target.value,
                                  },
                                }))
                              }
                              className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={edit.gst_rate}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...edit,
                                    gst_rate: e.target.value,
                                  },
                                }))
                              }
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={edit.platform_fee}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...edit,
                                    platform_fee: e.target.value,
                                  },
                                }))
                              }
                              className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={edit.commission_rate}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...edit,
                                    commission_rate:
                                      e.target.value,
                                  },
                                }))
                              }
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right"
                            />
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...edit,
                                    is_active: !edit.is_active,
                                  },
                                }))
                              }
                              className={
                                'w-10 h-6 rounded-full transition-colors ' +
                                (edit.is_active
                                  ? 'bg-green-500'
                                  : 'bg-gray-300')
                              }
                            >
                              <span
                                className={
                                  'block w-4 h-4 bg-white rounded-full transition-transform ' +
                                  (edit.is_active
                                    ? 'translate-x-5'
                                    : 'translate-x-1')
                                }
                              />
                            </button>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-blue-700 text-sm">
                            {formatINR(
                              breakdown.totalAmount
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={async () => {
              setPriceSaving(true);
              setPriceMsg(null);

              try {
                const updates = Object.entries(
                  priceEdits
                ).map(([id, edit]) =>
                  supabase
                    .from('service_prices')
                    .update({
                      base_price:
                        Number(edit.base_price) || 0,
                      gst_rate:
                        Number(edit.gst_rate) || 0,
                      platform_fee:
                        Number(edit.platform_fee) || 0,
                      commission_rate:
                        Number(edit.commission_rate) || 0,
                      is_active: edit.is_active,
                      updated_at:
                        new Date().toISOString(),
                    })
                    .eq('id', id)
                );

                const results =
                  await Promise.all(updates);

                const failed =
                  results.filter(
                    (r) => r.error
                  );

                if (failed.length > 0) {
                  setPriceMsg({
                    type: 'error',
                    text: `${failed.length} service(s) failed to save.`,
                  });
                } else {
                  setPriceMsg({
                    type: 'success',
                    text: 'All service prices updated successfully!',
                  });

                  await loadServicePrices();
                }
              } catch {
                setPriceMsg({
                  type: 'error',
                  text: 'Failed to save prices. Please try again.',
                });
              }

              setPriceSaving(false);
            }}
            disabled={priceSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {priceSaving ? (
              <Loader
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            Save Changes
          </button>
        </div>
      )}

      {/* ===================== AI DASHBOARD ===================== */}
      {tab === 'ai-dashboard' && (
        <AdminAIDashboard />
      )}

      {/* ===================== CRM ===================== */}
      {tab === 'crm' && (
        <AdminCRM />
      )}

      {/* ===================== AI CONTENT ===================== */}
      {tab === 'content' && (
        <AdminContent />
      )}

      {/* ===================== COUPONS ===================== */}
      {tab === 'coupons' && (
        <AdminCoupons />
      )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
        {label}
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
        <Icon
          size={14}
          className="text-gray-400 shrink-0"
        />
        {value}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color:
    | 'blue'
    | 'green'
    | 'purple'
    | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}
      >
        <Icon size={18} />
      </div>

      <div className="text-2xl font-extrabold text-gray-900">
        {value}
      </div>

      <div className="text-xs text-gray-400 font-medium">
        {label}
      </div>
    </div>
  );
}
function ReportCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
        <Icon size={18} className="text-blue-600" />
      </div>

      <div className="text-2xl font-extrabold text-gray-900">{value}</div>

      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}

function ReportMoneyCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
        <Icon size={18} className="text-green-600" />
      </div>

      <div className="text-2xl font-extrabold text-gray-900">{formatINR(value)}</div>

      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}

function SocialInput({
  icon: Icon,
  label,
  value,
  onChange,
  error,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
        <Icon size={14} className="text-gray-400" />
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
        }`}
      />

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}