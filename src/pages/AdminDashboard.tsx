import { useState, useEffect, useMemo } from 'react';
import {
  Loader, Calendar, User, Phone, MapPin, Wrench, DollarSign, TrendingUp,
  CheckCircle, Clock, X, ChevronDown, LogOut, LayoutDashboard, Users, Briefcase,
  Trash2, Eye, XCircle, Star, Award, Wallet, Lock, Unlock, History, ShieldCheck,
  CreditCard, LucideIcon, Globe, Facebook, Instagram, Twitter, Youtube, MessageCircle, Save,
  Bell, BellOff, Search, FileText, Tag, Sparkles, Send, BarChart3, Brain,
} from 'lucide-react';
import { supabase, Booking, Technician, BookingStatus, WalletTransaction, WalletRecharge } from '@/lib/supabase';
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
  'cancelled'
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

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [selectedTech, setSelectedTech] =
    useState<Technician | null>(null);

  const [assignTechId, setAssignTechId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [techUpdating, setTechUpdating] = useState(false);

  const [walletTxns, setWalletTxns] =
    useState<WalletTransaction[]>([]);

  const [recharges, setRecharges] =
    useState<
      (WalletRecharge & { technician_name?: string })[]
    >([]);

  const [walletUpdating, setWalletUpdating] = useState(false);

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
    useState<'all' | 'unread' | 'read'>('all');

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

  /*
   * ============================================================
   * ADMIN SESSION VERIFICATION
   * ============================================================
   *
   * IMPORTANT:
   * This project uses the custom admin-auth session system.
   *
   * Do NOT use:
   * supabase.auth.getSession()
   *
   * AdminLogin stores:
   * - vattams_admin
   * - vattams_admin_email
   * - vattams_admin_expires
   */

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      try {
        const adminToken =
          sessionStorage.getItem('vattams_admin');

        const expiresAt =
          sessionStorage.getItem(
            'vattams_admin_expires'
          );

        if (
          !adminToken ||
          (expiresAt &&
            new Date(expiresAt) < new Date())
        ) {
          sessionStorage.removeItem(
            'vattams_admin'
          );

          sessionStorage.removeItem(
            'vattams_admin_expires'
          );

          sessionStorage.removeItem(
            'vattams_admin_email'
          );

          if (mounted) {
            navigate('admin-login');
          }

          return;
        }

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
          'vattams_admin_email'
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

    return () => {
      mounted = false;
    };
  }, []);

  const loadData = async () => {
    const [
      bookingsRes,
      techRes
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('technicians')
        .select('*')
        .order('created_at', {
          ascending: false
        }),
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

    const [
      txnRes,
      rechargeRes
    ] = await Promise.all([
      supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', {
          ascending: false
        })
        .limit(100),

      supabase
        .from('wallet_recharges')
        .select(
          '*, technician:technicians(full_name)'
        )
        .order('created_at', {
          ascending: false
        })
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
              : undefined
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
        .order('created_at', {
          ascending: false
        }),
    ]);

    setPayments(allPay);

    if (custRes.data) {
      setCustomers(custRes.data);
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
        base_price: String(
          p.base_price
        ),

        gst_rate: String(
          p.gst_rate
        ),

        platform_fee: String(
          p.platform_fee
        ),

        commission_rate: String(
          p.commission_rate
        ),

        is_active: p.is_active,
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
          'Please fix the validation errors before saving.'
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
          'Social media links saved successfully!'
      });

      refreshSocialLinksCache();

      await loadSiteSettings();
    } else {
      setSocialMsg({
        type: 'error',
        text:
          result.error ??
          'Failed to save settings.'
      });
    }

    setSocialSaving(false);
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') {
      return bookings;
    }

    return bookings.filter(
      (b) => b.status === filter
    );
  }, [bookings, filter]);

  const filteredTechnicians = useMemo(() => {
    if (techFilter === 'all') {
      return technicians;
    }

    return technicians.filter(
      (t) => t.status === techFilter
    );
  }, [technicians, techFilter]);

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
          (b.total_amount ??
            b.amount ??
            0),
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
          (b.commission_amount ??
            0),
        0
      );

    const totalPlatformFee =
      completedBookings.reduce(
        (sum, b) =>
          sum +
          (b.platform_fee ?? 0),
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
            (b.commission_amount ??
              0)
          ),
        0
      );

    return {
      total: bookings.length,

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
            ].includes(b.status)
        ).length,

      inProgress:
        bookings.filter(
          (b) =>
            [
              'on_the_way',
              'in_progress',
              'job_started'
            ].includes(b.status)
        ).length,

      completed:
        completedBookings.length,

      cancelled:
        bookings.filter(
          (b) =>
            b.status === 'cancelled'
        ).length,

      revenue,
      totalGST,
      totalCommission,
      totalPlatformFee,
      techEarnings,

      technicians:
        technicians.filter(
          (t) =>
            t.status === 'active'
        ).length,

      pendingTechs:
        technicians.filter(
          (t) =>
            t.status === 'pending'
        ).length,
    };
  }, [bookings, technicians]);

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
          new Date().toISOString()
      })
      .eq('id', id);

    setBookings(
      (prev) =>
        prev.map(
          (b) =>
            b.id === id
              ? {
                  ...b,
                  status
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
                status
              }
            : prev
      );
    }

    const booking =
      bookings.find(
        (b) => b.id === id
      );

    if (booking) {
      if (
        status === 'in_progress'
      ) {
        await notifyCustomer.serviceStarted(
          booking.mobile_number,
          booking.booking_number,
          booking.id
        );
      } else if (
        status === 'completed'
      ) {
        await notifyCustomer.serviceCompleted(
          booking.mobile_number,
          booking.booking_number,
          booking.id
        );
      } else if (
        status === 'cancelled'
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

        status: 'confirmed',

        updated_at:
          new Date().toISOString()
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
      .from('technician_jobs')
      .insert({
        booking_id:
          selectedBooking.id,

        technician_id:
          assignTechId,

        status: 'assigned',
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
          t.id === assignTechId
      );

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
                    'confirmed'
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

    const updateData:
      Record<string, unknown> = {
      status
    };

    if (
      status === 'rejected' &&
      reason
    ) {
      updateData.rejection_reason =
        reason;
    }

    if (
      status === 'suspended' &&
      reason
    ) {
      updateData.suspend_reason =
        reason;
    }

    const { error } =
      await supabase
        .from('technicians')
        .update(updateData)
        .eq('id', id);

    if (!error) {
      const tech =
        technicians.find(
          (t) => t.id === id
        );

      setTechnicians(
        (prev) =>
          prev.map(
            (t) =>
              t.id === id
                ? {
                    ...t,
                    status
                  }
                : t
          )
      );

      if (
        selectedTech?.id === id
      ) {
        setSelectedTech(
          (prev) =>
            prev
              ? {
                  ...prev,
                  status
                }
              : prev
        );
      }

      if (tech) {
        if (
          status === 'active'
        ) {
          await notifyTechnician.registrationApproved(
            id,
            tech.full_name
          );
        } else {
          await notifyTechnician.registrationRejected(
            id,
            tech.full_name
          );
        }
      }
    }

    setTechUpdating(false);
  };

  const approveRecharge = async (
    rechargeId: string
  ) => {
    setWalletUpdating(true);

    const { error } =
      await supabase
        .from('wallet_recharges')
        .update({
          status: 'approved',
          approved_at:
            new Date().toISOString(),
          approved_by: 'admin',
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
              r.id === rechargeId
                ? {
                    ...r,
                    status:
                      'approved',
                    approved_at:
                      new Date().toISOString()
                  }
                : r
          )
      );

      const r =
        recharges.find(
          (x) =>
            x.id === rechargeId
        );

      if (r) {
        await notifyTechnician.walletRechargeApproved(
          r.technician_id,
          Number(r.amount)
        );

        const {
          data: updatedTech
        } = await supabase
          .from('technicians')
          .select('*')
          .eq(
            'id',
            r.technician_id
          )
          .maybeSingle();

        if (updatedTech) {
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
          data: newTxns
        } = await supabase
          .from(
            'wallet_transactions'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(100);

        if (newTxns) {
          setWalletTxns(
            newTxns
          );
        }
      }
    }

    setWalletUpdating(false);
  };

  const rejectRecharge = async (
    rechargeId: string
  ) => {
    setWalletUpdating(true);

    const { error } =
      await supabase
        .from('wallet_recharges')
        .update({
          status: 'rejected',
          approved_at:
            new Date().toISOString(),
          approved_by: 'admin',
        })
        .eq(
          'id',
          rechargeId
        );

    if (error) {
      console.error(
        '[AdminDashboard] recharge reject error:',
        error
      );
    } else {
      setRecharges(
        (prev) =>
          prev.map(
            (r) =>
              r.id === rechargeId
                ? {
                    ...r,
                    status:
                      'rejected'
                  }
                : r
          )
      );

      const r =
        recharges.find(
          (x) =>
            x.id === rechargeId
        );

      if (r) {
        await notifyTechnician.walletRechargeRejected(
          r.technician_id,
          Number(r.amount)
        );
      }
    }

    setWalletUpdating(false);
  };

  const toggleWalletLock = async (
    techId: string,
    lock: boolean
  ) => {
    setWalletUpdating(true);

    const { error } =
      await supabase
        .from('technicians')
        .update({
          wallet_locked:
            lock
        })
        .eq(
          'id',
          techId
        );

    if (error) {
      console.error(
        '[AdminDashboard] wallet lock toggle error:',
        error
      );
    } else {
      setTechnicians(
        (prev) =>
          prev.map(
            (t) =>
              t.id === techId
                ? {
                    ...t,
                    wallet_locked:
                      lock
                  }
                : t
          )
      );

      if (
        selectedWalletTech?.id ===
        techId
      ) {
        setSelectedWalletTech(
          (prev) =>
            prev
              ? {
                  ...prev,
                  wallet_locked:
                    lock
                }
              : prev
        );
      }

      if (lock) {
        await notifyTechnician.accountLocked(
          techId
        );
      } else {
        await notifyTechnician.accountUnlocked(
          techId
        );
      }
    }

    setWalletUpdating(false);
  };

  const deleteTechnician = async (
    id: string
  ) => {
    if (
      !confirm(
        'Are you sure you want to delete this technician? This cannot be undone.'
      )
    ) {
      return;
    }

    setTechUpdating(true);

    const { error } =
      await supabase
        .from('technicians')
        .delete()
        .eq(
          'id',
          id
        );

    if (!error) {
      setTechnicians(
        (prev) =>
          prev.filter(
            (t) => t.id !== id
          )
      );

      if (
        selectedTech?.id === id
      ) {
        setSelectedTech(null);
      }
    }

    setTechUpdating(false);
  };

  const verifyPayment = async (
    paymentId: string,
    status:
      | 'success'
      | 'failed'
  ) => {
    setPaymentUpdating(true);

    const updated =
      await updatePaymentStatus(
        paymentId,
        status,
        undefined,
        'admin'
      );

    if (updated) {
      setPayments(
        (prev) =>
          prev.map(
            (p) =>
              p.payment_id ===
              paymentId
                ? updated
                : p
          )
      );

      if (
        status === 'success'
      ) {
        await notifyAdmin.paymentReceived(
          updated.payee_name ||
            'Unknown',
          Number(
            updated.amount
          ),
          paymentId
        );
      } else {
        await notifyAdmin.failedPayment(
          updated.payee_name ||
            'Unknown',
          Number(
            updated.amount
          ),
          paymentId
        );
      }

      if (
        status === 'success' &&
        updated.purpose ===
          'wallet_recharge' &&
        updated.reference_id
      ) {
        const {
          data: recharge
        } = await supabase
          .from(
            'wallet_recharges'
          )
          .select('*')
          .eq(
            'technician_id',
            updated.reference_id
          )
          .eq(
            'status',
            'pending'
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(1)
          .maybeSingle();

        if (recharge) {
          await supabase
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
              recharge.id
            );

          await notifyTechnician.walletRechargeApproved(
            recharge.technician_id,
            Number(
              recharge.amount
            )
          );
        }
      }
    }

    setPaymentUpdating(false);
  };

  const logout = () => {
    sessionStorage.removeItem(
      'vattams_admin'
    );

    sessionStorage.removeItem(
      'vattams_admin_email'
    );

    sessionStorage.removeItem(
      'vattams_admin_expires'
    );

    navigate('home');
  };

  if (loading) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50">
        <Loader
          className="animate-spin text-blue-600"
          size={32}
        />
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="VATTAMS"
              className="h-14 w-auto rounded-xl"
            />

            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <LayoutDashboard
                  size={22}
                  className="text-blue-600"
                />
                Admin Dashboard
              </h1>

              <p className="text-gray-500 text-sm mt-0.5">
                Manage bookings, technicians, and revenue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter
              recipientType="admin"
              recipientId="admin"
            />

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            {
              icon: Briefcase,
              label: 'Total Bookings',
              value: stats.total,
              color: 'bg-blue-600'
            },
            {
              icon: Clock,
              label: 'Pending',
              value: stats.pending,
              color: 'bg-amber-500'
            },
            {
              icon: CheckCircle,
              label: 'Assigned',
              value: stats.assigned,
              color: 'bg-cyan-500'
            },
            {
              icon: TrendingUp,
              label: 'In Progress',
              value: stats.inProgress,
              color: 'bg-purple-500'
            },
            {
              icon: CheckCircle,
              label: 'Completed',
              value: stats.completed,
              color: 'bg-green-500'
            },
            {
              icon: XCircle,
              label: 'Cancelled',
              value: stats.cancelled,
              color: 'bg-red-500'
            },
          ].map((s) => {
            const Icon = s.icon;

            return (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}
                >
                  <Icon
                    size={18}
                    className="text-white"
                  />
                </div>

                <div className="text-2xl font-extrabold text-gray-900">
                  {s.value}
                </div>

                <div className="text-xs text-gray-400 font-medium">
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: DollarSign,
              label: 'Total Revenue',
              value: `₹${stats.revenue.toLocaleString('en-IN')}`,
              color: 'bg-emerald-600'
            },
            {
              icon: TrendingUp,
              label: 'GST Collected',
              value: `₹${stats.totalGST.toLocaleString('en-IN')}`,
              color: 'bg-orange-500'
            },
            {
              icon: Wallet,
              label: 'Commission',
              value: `₹${stats.totalCommission.toLocaleString('en-IN')}`,
              color: 'bg-blue-500'
            },
            {
              icon: Briefcase,
              label: 'Tech Earnings',
              value: `₹${stats.techEarnings.toLocaleString('en-IN')}`,
              color: 'bg-indigo-500'
            },
          ].map((s) => {
            const Icon = s.icon;

            return (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}
                >
                  <Icon
                    size={18}
                    className="text-white"
                  />
                </div>

                <div className="text-2xl font-extrabold text-gray-900">
                  {s.value}
                </div>

                <div className="text-xs text-gray-400 font-medium">
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">

          <button
            onClick={() =>
              setTab('bookings')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'bookings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Briefcase size={16} />
            Bookings

            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                tab === 'bookings'
                  ? 'bg-white/20'
                  : 'bg-gray-100'
              }`}
            >
              {stats.total}
            </span>
          </button>

          <button
            onClick={() =>
              setTab('technicians')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'technicians'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Users size={16} />
            Technicians

            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                tab === 'technicians'
                  ? 'bg-white/20'
                  : 'bg-gray-100'
              }`}
            >
              {technicians.length}
            </span>

            {stats.pendingTechs > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                {stats.pendingTechs} new
              </span>
            )}
          </button>

          <button
            onClick={() =>
              setTab('wallet')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'wallet'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Wallet size={16} />
            Wallet

            {recharges.filter(
              (r) =>
                r.status ===
                'pending'
            ).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                {
                  recharges.filter(
                    (r) =>
                      r.status ===
                      'pending'
                  ).length
                }
              </span>
            )}
          </button>

          <button
            onClick={() =>
              setTab('payments')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'payments'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <CreditCard size={16} />
            Payments

            {payments.filter(
              (p) =>
                p.status ===
                'pending'
            ).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                {
                  payments.filter(
                    (p) =>
                      p.status ===
                      'pending'
                  ).length
                }
              </span>
            )}
          </button>

          <button
            onClick={() =>
              setTab('customers')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'customers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <User size={16} />
            Customers

            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                tab === 'customers'
                  ? 'bg-white/20'
                  : 'bg-gray-100'
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            onClick={() =>
              setTab('reports')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <TrendingUp size={16} />
            Reports
          </button>

          <button
            onClick={() =>
              setTab('social')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'social'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Globe size={16} />
            Social Media
          </button>

          <button
            onClick={() =>
              setTab('pricing')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'pricing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Wrench size={16} />
            Service Pricing
          </button>

          <button
            onClick={() =>
              setTab('notifications')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'notifications'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Bell size={16} />
            Notifications
          </button>

          <button
            onClick={() =>
              setTab('ai-dashboard')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'ai-dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <TrendingUp size={16} />
            AI Dashboard
          </button>

          <button
            onClick={() =>
              setTab('crm')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'crm'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Calendar size={16} />
            AI CRM
          </button>

          <button
            onClick={() =>
              setTab('content')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'content'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <FileText size={16} />
            AI Content
          </button>

          <button
            onClick={() =>
              setTab('coupons')
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'coupons'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Tag size={16} />
            Coupons
          </button>
        </div>

        {/* ===================== BOOKINGS TAB ===================== */}

        {tab === 'bookings' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {(
                ['all', ...statusOptions]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setFilter(s as
                      | 'all'
                      | BookingStatus)
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    filter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
                  }`}
                >
                  {s === 'all'
                    ? 'All'
                    : s.replace(
                        '_',
                        ' '
                      )}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Booking #
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Customer
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Service
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        City
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>

                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {filteredBookings.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          No bookings found.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(
                        (b) => (
                          <tr
                            key={b.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-bold text-blue-700">
                              {b.booking_number}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">
                              {b.customer_name}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                              {b.service_category}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                              {b.city}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                                  statusColors[
                                    b.status
                                  ]
                                }`}
                              >
                                {b.status.replace(
                                  '_',
                                  ' '
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedBooking(
                                    b
                                  );

                                  setAssignTechId(
                                    b.assigned_technician_id ??
                                      ''
                                  );
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        )
                      )
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
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                {
                  key: 'all',
                  label: 'All'
                },
                {
                  key: 'pending',
                  label: 'Pending'
                },
                {
                  key: 'active',
                  label: 'Approved'
                },
                {
                  key: 'inactive',
                  label: 'Rejected'
                },
                {
                  key: 'rejected',
                  label: 'Rejected'
                },
                {
                  key: 'suspended',
                  label: 'Suspended'
                },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() =>
                    setTechFilter(
                      s.key as
                        | 'all'
                        | 'pending'
                        | 'active'
                        | 'inactive'
                        | 'rejected'
                        | 'suspended'
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    techFilter === s.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
                  }`}
                >
                  {s.label}

                  <span className="ml-1.5 text-xs opacity-70">
                    {s.key === 'all'
                      ? technicians.length
                      : technicians.filter(
                          (t) =>
                            t.status ===
                            s.key
                        ).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Name
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Mobile
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Service Category
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        City
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Experience
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>

                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {filteredTechnicians.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          No technicians found.
                        </td>
                      </tr>
                    ) : (
                      filteredTechnicians.map(
                        (t) => (
                          <tr
                            key={t.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <User
                                    size={14}
                                    className="text-blue-600"
                                  />
                                </div>

                                <div>
                                  <div className="text-sm font-bold text-gray-800">
                                    {t.full_name}
                                  </div>

                                  <div className="text-xs text-gray-400 sm:hidden">
                                    {t.mobile}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                              {t.mobile}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                              {t.service_categories.length >
                              0 ? (
                                <span className="line-clamp-1 max-w-[180px]">
                                  {t.service_categories.join(
                                    ', '
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-300">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                              {t.city}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden xl:table-cell">
                              {t.experience_years}{' '}
                              yrs
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                  techStatusColors[
                                    t.status
                                  ]
                                }`}
                              >
                                {
                                  techStatusLabel[
                                    t.status
                                  ]
                                }
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">

                                <button
                                  onClick={() =>
                                    setSelectedTech(
                                      t
                                    )
                                  }
                                  title="View"
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                  <Eye
                                    size={15}
                                  />
                                </button>

                                {t.status !==
                                  'active' && (
                                  <button
                                    onClick={() =>
                                      updateTechStatus(
                                        t.id,
                                        'active'
                                      )
                                    }
                                    title="Approve"
                                    disabled={
                                      techUpdating
                                    }
                                    className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle
                                      size={15}
                                    />
                                  </button>
                                )}

                                {t.status !==
                                  'inactive' && (
                                  <button
                                    onClick={() =>
                                      updateTechStatus(
                                        t.id,
                                        'inactive'
                                      )
                                    }
                                    title="Reject"
                                    disabled={
                                      techUpdating
                                    }
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle
                                      size={15}
                                    />
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    deleteTechnician(
                                      t.id
                                    )
                                  }
                                  title="Delete"
                                  disabled={
                                    techUpdating
                                  }
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>

                              </div>
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ===================== WALLET TAB ===================== */}

        {tab === 'wallet' && (
          <div className="space-y-6">

            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wallet
                  size={16}
                  className="text-blue-600"
                />
                Technician Wallets
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {technicians.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                  >

                    <div className="flex items-center justify-between mb-3">

                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {t.full_name}
                        </div>

                        <div className="text-xs text-gray-400">
                          {t.city} · {t.mobile}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          t.wallet_locked
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {t.wallet_locked ? (
                          <>
                            <Lock
                              size={10}
                            />
                            Locked
                          </>
                        ) : (
                          <>
                            <Unlock
                              size={10}
                            />
                            Active
                          </>
                        )}
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">

                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xs text-blue-500 font-medium">
                          Balance
                        </div>

                        <div className="font-bold text-blue-700">
                          ₹
                          {Number(
                            t.wallet_balance
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-2">
                        <div className="text-xs text-amber-500 font-medium">
                          Locked Deposit
                        </div>

                        <div className="font-bold text-amber-700">
                          ₹
                          {Number(
                            t.locked_deposit
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </div>
                      </div>

                      <div className="bg-emerald-50 rounded-lg p-2">
                        <div className="text-xs text-emerald-500 font-medium">
                          Available
                        </div>

                        <div className="font-bold text-emerald-700">
                          ₹
                          {Number(
                            t.available_balance
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xs text-red-500 font-medium">
                          Commission Due
                        </div>

                        <div className="font-bold text-red-700">
                          ₹
                          {Number(
                            t.commission_due
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">

                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <ShieldCheck
                          size={12}
                          className="text-blue-500"
                        />

                        {t.deposit_released
                          ? 'Deposit released'
                          : `${t.completed_jobs_count}/3 jobs to release`}
                      </div>

                      <button
                        onClick={() =>
                          setSelectedWalletTech(
                            t
                          )
                        }
                        className="text-xs text-blue-600 font-semibold hover:text-blue-700"
                      >
                        View Details
                      </button>

                    </div>

                    <div className="flex gap-2 mt-2">

                      {t.wallet_locked ? (
                        <button
                          onClick={() =>
                            toggleWalletLock(
                              t.id,
                              false
                            )
                          }
                          disabled={
                            walletUpdating
                          }
                          className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Unlock
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            toggleWalletLock(
                              t.id,
                              true
                            )
                          }
                          disabled={
                            walletUpdating
                          }
                          className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Lock
                        </button>
                      )}

                    </div>

                  </div>
                ))}

                {technicians.length ===
                  0 && (
                  <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                    No technicians found.
                  </div>
                )}

              </div>
            </div>
              )}
            {/* Pending Wallet Recharges */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard
                  size={16}
                  className="text-amber-600"
                />
                Pending Wallet Recharges
              </h3>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Technician
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                          Reference
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {recharges.filter(
                        (r) => r.status === 'pending'
                      ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-10 text-gray-400 text-sm"
                          >
                            No pending recharge requests.
                          </td>
                        </tr>
                      ) : (
                        recharges
                          .filter(
                            (r) =>
                              r.status ===
                              'pending'
                          )
                          .map((r) => (
                            <tr
                              key={r.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-sm text-gray-800">
                                  {r.technician_name ??
                                    'Unknown'}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <span className="font-bold text-emerald-600">
                                  ₹
                                  {Number(
                                    r.amount
                                  ).toLocaleString(
                                    'en-IN'
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                                {r.reference_number ??
                                  r.id}
                              </td>

                              <td className="px-4 py-3">
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                  Pending
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      approveRecharge(
                                        r.id
                                      )
                                    }
                                    disabled={
                                      walletUpdating
                                    }
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() =>
                                      rejectRecharge(
                                        r.id
                                      )
                                    }
                                    disabled={
                                      walletUpdating
                                    }
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold disabled:opacity-50"
                                  >
                                    Reject
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
            </div>

            {/* Wallet Transactions */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <History
                  size={16}
                  className="text-blue-600"
                />
                Recent Wallet Transactions
              </h3>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Type
                        </th>

                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Amount
                        </th>

                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                          Description
                        </th>

                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {walletTxns.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-10 text-gray-400 text-sm"
                          >
                            No wallet transactions found.
                          </td>
                        </tr>
                      ) : (
                        walletTxns
                          .slice(0, 50)
                          .map((txn) => (
                            <tr
                              key={txn.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    Number(
                                      txn.amount
                                    ) >= 0
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {txn.transaction_type ??
                                    'Transaction'}
                                </span>
                              </td>

                              <td className="px-4 py-3 font-bold text-sm">
                                <span
                                  className={
                                    Number(
                                      txn.amount
                                    ) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }
                                >
                                  {Number(
                                    txn.amount
                                  ) >= 0
                                    ? '+'
                                    : ''}
                                  ₹
                                  {Math.abs(
                                    Number(
                                      txn.amount
                                    )
                                  ).toLocaleString(
                                    'en-IN'
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                                {txn.description ??
                                  '—'}
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                                {txn.created_at
                                  ? new Date(
                                      txn.created_at
                                    ).toLocaleString(
                                      'en-IN'
                                    )
                                  : '—'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ===================== PAYMENTS TAB ===================== */}

        {tab === 'payments' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                'all',
                'pending',
                'success',
                'failed'
              ].map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setPaymentFilter(
                      s as
                        | 'all'
                        | 'pending'
                        | 'success'
                        | 'failed'
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                    paymentFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Payment ID
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Customer
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Amount
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                        Purpose
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>

                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {payments.filter(
                      (p) =>
                        paymentFilter ===
                          'all' ||
                        p.status ===
                          paymentFilter
                    ).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          No payments found.
                        </td>
                      </tr>
                    ) : (
                      payments
                        .filter(
                          (p) =>
                            paymentFilter ===
                              'all' ||
                            p.status ===
                              paymentFilter
                        )
                        .map((p) => (
                          <tr
                            key={p.payment_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                              {p.payment_id}
                            </td>

                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-800">
                                {p.payee_name ??
                                  p.customer_name ??
                                  '—'}
                              </div>

                              <div className="text-xs text-gray-400">
                                {p.payee_mobile ??
                                  p.customer_mobile ??
                                  ''}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-bold text-gray-800">
                              ₹
                              {Number(
                                p.amount
                              ).toLocaleString(
                                'en-IN'
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                              {p.purpose ??
                                '—'}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  p.status ===
                                  'success'
                                    ? 'bg-green-100 text-green-700'
                                    : p.status ===
                                      'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {p.status ===
                              'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      verifyPayment(
                                        p.payment_id,
                                        'success'
                                      )
                                    }
                                    disabled={
                                      paymentUpdating
                                    }
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                  >
                                    Verify
                                  </button>

                                  <button
                                    onClick={() =>
                                      verifyPayment(
                                        p.payment_id,
                                        'failed'
                                      )
                                    }
                                    disabled={
                                      paymentUpdating
                                    }
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  —
                                </span>
                              )}
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

        {/* ===================== CUSTOMERS TAB ===================== */}

        {tab === 'customers' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={customerFilter}
                  onChange={(e) =>
                    setCustomerFilter(
                      e.target.value
                    )
                  }
                  placeholder="Search customers by name, mobile, email..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Customer
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">      {tab === 'ai-dashboard' && <AdminAIDashboard />}
      {tab === 'crm' && <AdminCRM />}
      {tab === 'content' && <AdminContent />}
      {tab === 'coupons' && <AdminCoupons />}
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
  color: 'blue' | 'green' | 'purple' | 'amber';
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