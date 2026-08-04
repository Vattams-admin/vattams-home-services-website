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
import { fetchAnalyticsSummary, fetchRevenueGraph, fetchServiceRevenue, fetchCityRevenue, fetchTechnicianPerformance, predictDemand, generateAIRecommendations } from '@/lib/analytics';
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

const statusOptions: BookingStatus[] = ['pending', 'confirmed', 'assigned', 'accepted', 'on_the_way', 'in_progress', 'job_started', 'job_completed', 'completed', 'cancelled'];

type Tab = 'bookings' | 'technicians' | 'customers' | 'wallet' | 'payments' | 'reports' | 'social' | 'notifications' | 'pricing' | 'ai-dashboard' | 'crm' | 'content' | 'coupons';

export default function AdminDashboard() {
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [techFilter, setTechFilter] = useState<'all' | 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended'>('all');
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('pending');
  const [paymentUpdating, setPaymentUpdating] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [socialForm, setSocialForm] = useState<SiteSettingsInput>({
    google_business_url: '', facebook_url: '', instagram_url: '',
    twitter_url: '', youtube_url: '', whatsapp_number: '', website_url: '',
  });
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialMsg, setSocialMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifLogs, setNotifLogs] = useState<NotificationRow[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [announcementTarget, setAnnouncementTarget] = useState<'technicians' | 'customers' | 'individual'>('technicians');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementTechId, setAnnouncementTechId] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceEdits, setPriceEdits] = useState<Record<string, { base_price: string; gst_rate: string; platform_fee: string; commission_rate: string; is_active: boolean }>>({});
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceMsg, setPriceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const adminToken = sessionStorage.getItem('vattams_admin');
    const expiresAt = sessionStorage.getItem('vattams_admin_expires');
    if (!adminToken || (expiresAt && new Date(expiresAt) < new Date())) {
      sessionStorage.removeItem('vattams_admin');
      sessionStorage.removeItem('vattams_admin_expires');
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

    const [pendingPay, allPay, custRes] = await Promise.all([
      fetchPendingPayments(),
      fetchAllPayments(),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
    ]);
    setPayments(allPay);
    if (custRes.data) setCustomers(custRes.data);
    if (custRes.error) console.error('[AdminDashboard] customers query error:', custRes.error);
    await loadSiteSettings();
    await loadNotifLogs();
    await loadServicePrices();
    setLoading(false);
  };

  const loadServicePrices = async () => {
    const prices = await fetchAllServicePrices();
    setServicePrices(prices);
    const edits: Record<string, { base_price: string; gst_rate: string; platform_fee: string; commission_rate: string; is_active: boolean }> = {};
    prices.forEach((p) => {
      edits[p.id] = {
        base_price: String(p.base_price),
        gst_rate: String(p.gst_rate),
        platform_fee: String(p.platform_fee),
        commission_rate: String(p.commission_rate),
        is_active: p.is_active,
      };
    });
    setPriceEdits(edits);
  };

  const loadNotifLogs = async () => {
    const logs = await fetchNotifications('admin', 'admin', 100);
    setNotifLogs(logs);
  };

  const loadSiteSettings = async () => {
    const s = await fetchSiteSettings();
    setSiteSettings(s);
    setSocialForm({
      google_business_url: s.google_business_url ?? '',
      facebook_url: s.facebook_url ?? '',
      instagram_url: s.instagram_url ?? '',
      twitter_url: s.twitter_url ?? '',
      youtube_url: s.youtube_url ?? '',
      whatsapp_number: s.whatsapp_number ?? '',
      website_url: s.website_url ?? '',
    });
  };

  const handleSocialSave = async () => {
    setSocialSaving(true);
    setSocialMsg(null);
    const errors = validateSettings(socialForm);
    setSocialErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSocialMsg({ type: 'error', text: 'Please fix the validation errors before saving.' });
      setSocialSaving(false);
      return;
    }
    const result = await saveSiteSettings(socialForm, 'admin');
    if (result.success) {
      setSocialMsg({ type: 'success', text: 'Social media links saved successfully!' });
      refreshSocialLinksCache();
      await loadSiteSettings();
    } else {
      setSocialMsg({ type: 'error', text: result.error ?? 'Failed to save settings.' });
    }
    setSocialSaving(false);
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
    const completedBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'job_completed');
    const revenue = completedBookings.reduce((sum, b) => sum + (b.total_amount ?? b.amount ?? 0), 0);
    const totalGST = completedBookings.reduce((sum, b) => sum + (b.gst_amount ?? 0), 0);
    const totalCommission = completedBookings.reduce((sum, b) => sum + (b.commission_amount ?? 0), 0);
    const totalPlatformFee = completedBookings.reduce((sum, b) => sum + (b.platform_fee ?? 0), 0);
    const techEarnings = completedBookings.reduce((sum, b) => sum + ((b.base_price ?? b.amount ?? 0) - (b.commission_amount ?? 0)), 0);
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      assigned: bookings.filter((b) => ['assigned', 'accepted'].includes(b.status)).length,
      inProgress: bookings.filter((b) => ['on_the_way', 'in_progress', 'job_started'].includes(b.status)).length,
      completed: completedBookings.length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      revenue,
      totalGST,
      totalCommission,
      totalPlatformFee,
      techEarnings,
      technicians: technicians.filter((t) => t.status === 'active').length,
      pendingTechs: technicians.filter((t) => t.status === 'pending').length,
    };
  }, [bookings, technicians]);

  const updateStatus = async (id: string, status: BookingStatus) => {
    setUpdating(true);
    await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selectedBooking?.id === id) setSelectedBooking((prev) => (prev ? { ...prev, status } : prev));

    // Send customer notification based on status
    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      if (status === 'in_progress') {
        await notifyCustomer.serviceStarted(booking.mobile_number, booking.booking_number, booking.id);
      } else if (status === 'completed') {
        await notifyCustomer.serviceCompleted(booking.mobile_number, booking.booking_number, booking.id);
      } else if (status === 'cancelled') {
        await Promise.all([
          notifyCustomer.bookingCancelled(booking.mobile_number, booking.booking_number, booking.id),
          booking.assigned_technician_id
            ? notifyTechnician.jobCancelled(booking.assigned_technician_id, booking.booking_number)
            : null,
        ]);
      }
    }

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

    const { data: jobData, error: jobErr } = await supabase.from('technician_jobs').insert({
      booking_id: selectedBooking.id,
      technician_id: assignTechId,
      status: 'assigned',
    }).select().single();
    if (jobErr) console.error('[AdminDashboard] technician_jobs insert error:', jobErr);

    const assignedTech = technicians.find((t) => t.id === assignTechId);

    // Send notifications
    await Promise.all([
      notifyCustomer.technicianAssigned(
        selectedBooking.mobile_number, selectedBooking.booking_number,
        assignedTech?.full_name ?? 'A technician', selectedBooking.id,
      ),
      jobData
        ? notifyTechnician.jobAssigned(assignTechId, selectedBooking.booking_number, jobData.id)
        : null,
    ]);

    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedBooking.id ? { ...b, assigned_technician_id: assignTechId, status: 'confirmed' } : b
      )
    );
    setSelectedBooking(null);
    setAssignTechId('');
    setUpdating(false);
  };

  const updateTechStatus = async (id: string, status: 'active' | 'inactive' | 'rejected' | 'suspended', reason?: string) => {
    setTechUpdating(true);
    const updateData: Record<string, unknown> = { status };
    if (status === 'rejected' && reason) updateData.rejection_reason = reason;
    if (status === 'suspended' && reason) updateData.suspend_reason = reason;
    const { error } = await supabase.from('technicians').update(updateData).eq('id', id);
    if (!error) {
      const tech = technicians.find((t) => t.id === id);
      setTechnicians((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      if (selectedTech?.id === id) setSelectedTech((prev) => (prev ? { ...prev, status } : prev));

      // Send technician notification
      if (tech) {
        if (status === 'active') {
          await notifyTechnician.registrationApproved(id, tech.full_name);
        } else {
          await notifyTechnician.registrationRejected(id, tech.full_name);
        }
      }
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
        await notifyTechnician.walletRechargeApproved(r.technician_id, Number(r.amount));
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
      const r = recharges.find((x) => x.id === rechargeId);
      if (r) {
        await notifyTechnician.walletRechargeRejected(r.technician_id, Number(r.amount));
      }
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

      // Send technician notification
      if (lock) {
        await notifyTechnician.accountLocked(techId);
      } else {
        await notifyTechnician.accountUnlocked(techId);
      }
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

      // Send admin notification
      if (status === 'success') {
        await notifyAdmin.paymentReceived(updated.payee_name || 'Unknown', Number(updated.amount), paymentId);
      } else {
        await notifyAdmin.failedPayment(updated.payee_name || 'Unknown', Number(updated.amount), paymentId);
      }

      // If it's a wallet_recharge success, also approve the recharge request
      if (status === 'success' && updated.purpose === 'wallet_recharge' && updated.reference_id) {
        const { data: recharge } = await supabase.from('wallet_recharges')
          .select('*').eq('technician_id', updated.reference_id).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (recharge) {
          await supabase.from('wallet_recharges').update({
            status: 'approved', approved_at: new Date().toISOString(), approved_by: 'admin',
          }).eq('id', recharge.id);
          await notifyTechnician.walletRechargeApproved(recharge.technician_id, Number(recharge.amount));
        }
      }
    }
    setPaymentUpdating(false);
  };

  const logout = () => {
    sessionStorage.removeItem('vattams_admin');
    sessionStorage.removeItem('vattams_admin_expires');
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
          <div className="flex items-center gap-3">
            <NotificationCenter recipientType="admin" recipientId="admin" />
            <button onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Briefcase, label: 'Total Bookings', value: stats.total, color: 'bg-blue-600' },
            { icon: Clock, label: 'Pending', value: stats.pending, color: 'bg-amber-500' },
            { icon: CheckCircle, label: 'Assigned', value: stats.assigned, color: 'bg-cyan-500' },
            { icon: TrendingUp, label: 'In Progress', value: stats.inProgress, color: 'bg-purple-500' },
            { icon: CheckCircle, label: 'Completed', value: stats.completed, color: 'bg-green-500' },
            { icon: XCircle, label: 'Cancelled', value: stats.cancelled, color: 'bg-red-500' },
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

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: DollarSign, label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, color: 'bg-emerald-600' },
            { icon: TrendingUp, label: 'GST Collected', value: `₹${stats.totalGST.toLocaleString('en-IN')}`, color: 'bg-orange-500' },
            { icon: Wallet, label: 'Commission', value: `₹${stats.totalCommission.toLocaleString('en-IN')}`, color: 'bg-blue-500' },
            { icon: Briefcase, label: 'Tech Earnings', value: `₹${stats.techEarnings.toLocaleString('en-IN')}`, color: 'bg-indigo-500' },
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
          <button onClick={() => setTab('customers')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'customers' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <User size={16} /> Customers
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${tab === 'customers' ? 'bg-white/20' : 'bg-gray-100'}`}>{customers.length}</span>
          </button>
          <button onClick={() => setTab('reports')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'reports' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <TrendingUp size={16} /> Reports
          </button>
          <button onClick={() => setTab('social')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'social' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Globe size={16} /> Social Media
          </button>
          <button onClick={() => setTab('pricing')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'pricing' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Wrench size={16} /> Service Pricing
          </button>
          <button onClick={() => setTab('notifications')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'notifications' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Bell size={16} /> Notifications
          </button>
          <button onClick={() => setTab('ai-dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'ai-dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <TrendingUp size={16} /> AI Dashboard
          </button>
          <button onClick={() => setTab('crm')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'crm' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Calendar size={16} /> AI CRM
          </button>
          <button onClick={() => setTab('content')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'content' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <FileText size={16} /> AI Content
          </button>
          <button onClick={() => setTab('coupons')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'coupons' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}>
            <Tag size={16} /> Coupons
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
                { key: 'rejected', label: 'Rejected' },
                { key: 'suspended', label: 'Suspended' },
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
                {selectedTech.status !== 'inactive' && selectedTech.status !== 'rejected' && (
                  <button onClick={() => updateTechStatus(selectedTech.id, 'rejected')} disabled={techUpdating}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    <XCircle size={16} /> Reject
                  </button>
                )}
                {selectedTech.status === 'active' && (
                  <button onClick={() => updateTechStatus(selectedTech.id, 'suspended')} disabled={techUpdating}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    <ShieldCheck size={16} /> Suspend
                  </button>
                )}
                <button onClick={() => deleteTechnician(selectedTech.id)} disabled={techUpdating}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors disabled:opacity-50">
                  <Trash2 size={16} /> Delete
                </button>
              </div>

              {/* Documents */}
              {(selectedTech.aadhaar_url || selectedTech.pan_url || selectedTech.dl_url || selectedTech.profile_photo_url) && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Uploaded Documents</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Aadhaar', url: selectedTech.aadhaar_url },
                      { label: 'PAN', url: selectedTech.pan_url },
                      { label: 'Driving License', url: selectedTech.dl_url },
                      { label: 'Profile Photo', url: selectedTech.profile_photo_url },
                    ].filter((d): d is { label: string; url: string } => !!d.url).map((d) => (
                      <a key={d.label} href={d.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors">
                        <FileText size={14} /> {d.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
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

      {/* ===================== CUSTOMERS TAB ===================== */}
      {tab === 'customers' && (
        <div className="max-w-5xl">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">Customer Management</h2>
            <p className="text-sm text-gray-500">View all registered customers and their booking history.</p>
          </div>

          <div className="mb-4">
            <input type="text" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Search by name, mobile, email, or city..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
          </div>

          {customers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Users size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No registered customers yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Mobile</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">City</th>
                      <th className="text-left py-3 px-4 font-semibold">Bookings</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter((c) => {
                        if (!customerFilter) return true;
                        const q = customerFilter.toLowerCase();
                        return c.full_name.toLowerCase().includes(q) ||
                          c.mobile.includes(q) ||
                          (c.email ?? '').toLowerCase().includes(q) ||
                          (c.city ?? '').toLowerCase().includes(q);
                      })
                      .map((c) => {
                        const custBookings = bookings.filter((b) => b.customer_id === c.id || b.mobile_number === c.mobile);
                        return (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-blue-50/30">
                            <td className="py-3 px-4 font-semibold text-gray-800">{c.full_name}</td>
                            <td className="py-3 px-4 text-gray-600">{c.mobile}</td>
                            <td className="py-3 px-4 text-gray-600">{c.email ?? '—'}</td>
                            <td className="py-3 px-4 text-gray-600">{c.city ?? '—'}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{custBookings.length}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== REPORTS TAB ===================== */}
      {tab === 'reports' && (() => {
        const completedBookings = bookings.filter((b) => b.status === 'completed');
        const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
        const pendingBookings = bookings.filter((b) => b.status === 'pending');
        const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
        const inProgressBookings = bookings.filter((b) => b.status === 'in_progress');
        const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
        const pendingRevenue = pendingBookings.concat(confirmedBookings, inProgressBookings).reduce((sum, b) => sum + (b.amount ?? 0), 0);
        const activeTechs = technicians.filter((t) => t.status === 'active').length;
        const pendingTechs = technicians.filter((t) => t.status === 'pending').length;
        const completedPayments = payments.filter((p) => p.status === 'success');
        const totalPaymentsAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const avgBookingValue = completedBookings.length > 0 ? Math.round(totalRevenue / completedBookings.length) : 0;

        // Service distribution
        const serviceCounts: Record<string, number> = {};
        bookings.forEach((b) => { serviceCounts[b.service_category] = (serviceCounts[b.service_category] ?? 0) + 1; });
        const topServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxServiceCount = topServices[0]?.[1] ?? 1;

        // City distribution
        const cityCounts: Record<string, number> = {};
        bookings.forEach((b) => { cityCounts[b.city] = (cityCounts[b.city] ?? 0) + 1; });
        const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxCityCount = topCities[0]?.[1] ?? 1;

        // Monthly revenue (last 6 months)
        const now = new Date();
        const months: { label: string; revenue: number; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = d.toISOString();
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
          const monthBookings = completedBookings.filter((b) => b.created_at >= monthStart && b.created_at < monthEnd);
          const rev = monthBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
          months.push({ label: d.toLocaleString('en-IN', { month: 'short' }), revenue: rev, count: monthBookings.length });
        }
        const maxMonthlyRevenue = Math.max(...months.map((m) => m.revenue), 1);

        return (
          <div className="max-w-5xl space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Reports &amp; Analytics</h2>
              <p className="text-sm text-gray-500">Business performance overview and insights.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={DollarSign} label="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} color="green" />
              <MetricCard icon={Briefcase} label="Total Bookings" value={String(bookings.length)} color="blue" />
              <MetricCard icon={TrendingUp} label="Avg Booking Value" value={`₹${avgBookingValue.toLocaleString('en-IN')}`} color="purple" />
              <MetricCard icon={Users} label="Active Technicians" value={String(activeTechs)} color="amber" />
            </div>

            {/* Booking Status Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Booking Status Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Pending', count: pendingBookings.length, color: 'bg-amber-500' },
                  { label: 'Confirmed', count: confirmedBookings.length, color: 'bg-blue-500' },
                  { label: 'In Progress', count: inProgressBookings.length, color: 'bg-purple-500' },
                  { label: 'Completed', count: completedBookings.length, color: 'bg-green-500' },
                  { label: 'Cancelled', count: cancelledBookings.length, color: 'bg-red-500' },
                ].map((s) => {
                  const pct = bookings.length > 0 ? (s.count / bookings.length) * 100 : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-gray-600 font-medium">{s.label}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div className={`${s.color} h-full rounded-full flex items-center justify-end pr-2 text-xs text-white font-bold transition-all`} style={{ width: `${Math.max(pct, s.count > 0 ? 8 : 0)}%` }}>
                          {s.count > 0 && s.count}
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm text-gray-500">{pct.toFixed(0)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Monthly Revenue (Last 6 Months)</h3>
              <div className="flex items-end gap-3 h-48">
                {months.map((m) => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-bold text-gray-700">{m.revenue > 0 ? `₹${(m.revenue / 1000).toFixed(1)}k` : '—'}</div>
                    <div className="w-full bg-gray-100 rounded-t-lg flex items-end" style={{ height: '140px' }}>
                      <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all"
                        style={{ height: `${(m.revenue / maxMonthlyRevenue) * 100}%`, minHeight: m.revenue > 0 ? '8px' : '0' }} />
                    </div>
                    <div className="text-xs text-gray-500">{m.label}</div>
                    <div className="text-xs text-gray-400">{m.count} bookings</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column: Services + Cities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Top Services by Bookings</h3>
                {topServices.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No bookings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topServices.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-32 text-sm text-gray-600 font-medium truncate">{name}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full" style={{ width: `${(count / maxServiceCount) * 100}%` }} />
                        </div>
                        <div className="w-8 text-right text-sm text-gray-500 font-semibold">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Top Cities by Bookings</h3>
                {topCities.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No bookings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topCities.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-32 text-sm text-gray-600 font-medium truncate">{name}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full" style={{ width: `${(count / maxCityCount) * 100}%` }} />
                        </div>
                        <div className="w-8 text-right text-sm text-gray-500 font-semibold">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-400">Pending Revenue:</span> <span className="font-bold text-gray-900">₹{pendingRevenue.toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-400">Pending Techs:</span> <span className="font-bold text-gray-900">{pendingTechs}</span></div>
                <div><span className="text-gray-400">Total Customers:</span> <span className="font-bold text-gray-900">{customers.length}</span></div>
                <div><span className="text-gray-400">Payments Collected:</span> <span className="font-bold text-gray-900">₹{totalPaymentsAmount.toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-400">Cancellation Rate:</span> <span className="font-bold text-gray-900">{bookings.length > 0 ? ((cancelledBookings.length / bookings.length) * 100).toFixed(1) : 0}%</span></div>
                <div><span className="text-gray-400">Completion Rate:</span> <span className="font-bold text-gray-900">{bookings.length > 0 ? ((completedBookings.length / bookings.length) * 100).toFixed(1) : 0}%</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================== SOCIAL MEDIA TAB ===================== */}
      {tab === 'social' && (
        <div className="max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">Social Media &amp; Google Business</h2>
            <p className="text-sm text-gray-500">
              Manage your social media profile links and Google Business Profile. Icons appear on the Home page, Contact page, Footer, and Mobile Menu automatically. Empty fields hide the icon.
            </p>
          </div>

          {socialMsg && (
            <div className={'rounded-xl p-3 text-sm mb-4 ' + (socialMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
              {socialMsg.text}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            {/* Google Business */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Globe size={16} className="text-blue-600" /> Google Business Profile URL
              </label>
              <input type="url" value={socialForm.google_business_url}
                onChange={(e) => setSocialForm({ ...socialForm, google_business_url: e.target.value })}
                placeholder="https://business.google.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.google_business_url && <p className="text-xs text-red-500 mt-1">{socialErrors.google_business_url}</p>}
            </div>

            {/* Facebook */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Facebook size={16} className="text-blue-700" /> Facebook Page URL
              </label>
              <input type="url" value={socialForm.facebook_url}
                onChange={(e) => setSocialForm({ ...socialForm, facebook_url: e.target.value })}
                placeholder="https://facebook.com/yourpage"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.facebook_url && <p className="text-xs text-red-500 mt-1">{socialErrors.facebook_url}</p>}
            </div>

            {/* Instagram */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Instagram size={16} className="text-pink-600" /> Instagram Profile URL
              </label>
              <input type="url" value={socialForm.instagram_url}
                onChange={(e) => setSocialForm({ ...socialForm, instagram_url: e.target.value })}
                placeholder="https://instagram.com/yourprofile"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.instagram_url && <p className="text-xs text-red-500 mt-1">{socialErrors.instagram_url}</p>}
            </div>

            {/* Twitter / X */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Twitter size={16} className="text-sky-600" /> X (Twitter) Profile URL
              </label>
              <input type="url" value={socialForm.twitter_url}
                onChange={(e) => setSocialForm({ ...socialForm, twitter_url: e.target.value })}
                placeholder="https://x.com/yourhandle"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.twitter_url && <p className="text-xs text-red-500 mt-1">{socialErrors.twitter_url}</p>}
            </div>

            {/* YouTube */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Youtube size={16} className="text-red-600" /> YouTube Channel URL
              </label>
              <input type="url" value={socialForm.youtube_url}
                onChange={(e) => setSocialForm({ ...socialForm, youtube_url: e.target.value })}
                placeholder="https://youtube.com/@yourchannel"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.youtube_url && <p className="text-xs text-red-500 mt-1">{socialErrors.youtube_url}</p>}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <MessageCircle size={16} className="text-green-500" /> WhatsApp Number
              </label>
              <input type="tel" value={socialForm.whatsapp_number}
                onChange={(e) => setSocialForm({ ...socialForm, whatsapp_number: e.target.value })}
                placeholder="918189800757"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.whatsapp_number && <p className="text-xs text-red-500 mt-1">{socialErrors.whatsapp_number}</p>}
              <p className="text-xs text-gray-400 mt-1">Enter in international format without + (e.g. 918189800757)</p>
            </div>

            {/* Website */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Globe size={16} className="text-gray-600" /> Website URL
              </label>
              <input type="url" value={socialForm.website_url}
                onChange={(e) => setSocialForm({ ...socialForm, website_url: e.target.value })}
                placeholder="https://www.yourwebsite.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              {socialErrors.website_url && <p className="text-xs text-red-500 mt-1">{socialErrors.website_url}</p>}
            </div>

            {siteSettings?.updated_at && (
              <p className="text-xs text-gray-400">Last updated: {new Date(siteSettings.updated_at).toLocaleString('en-IN')}{siteSettings.updated_by ? ` by ${siteSettings.updated_by}` : ''}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSocialSave} disabled={socialSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {socialSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                Save Settings
              </button>
              <button onClick={() => { setSocialForm({ google_business_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: '', whatsapp_number: '', website_url: '' }); setSocialErrors({}); setSocialMsg(null); }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="max-w-5xl">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Notification Center</h2>
              <p className="text-sm text-gray-500">Send announcements and view notification logs.</p>
            </div>
            <button onClick={() => { setAnnouncementModal(true); setAnnouncementResult(null); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-blue-200">
              <Bell size={16} /> New Announcement
            </button>
          </div>

          {/* Admin's own notification bell */}
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Your Notifications</h3>
              <NotificationCenter recipientType="admin" recipientId="admin" />
            </div>
          </div>

          {/* Notification Logs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Notification Logs</h3>
              <div className="flex gap-1.5">
                {(['all', 'unread', 'read'] as const).map((f) => (
                  <button key={f} onClick={() => setNotifFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${notifFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {notifLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <BellOff size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="text-left py-2 px-3 font-semibold">Title</th>
                      <th className="text-left py-2 px-3 font-semibold">Message</th>
                      <th className="text-left py-2 px-3 font-semibold">Type</th>
                      <th className="text-left py-2 px-3 font-semibold">Status</th>
                      <th className="text-left py-2 px-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifLogs
                      .filter((n) => notifFilter === 'all' || (notifFilter === 'unread' ? !n.is_read : n.is_read))
                      .map((n) => (
                      <tr key={n.id} className={`border-b border-gray-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{n.title}</td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{n.message}</td>
                        <td className="py-2.5 px-3 text-gray-600 capitalize">{n.type.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            n.status === 'read' ? 'bg-green-100 text-green-700' :
                            n.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            n.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{n.status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">{new Date(n.created_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {announcementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAnnouncementModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-extrabold text-gray-900">Send Announcement</h2>
              <button onClick={() => setAnnouncementModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Target selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
                <div className="flex gap-2">
                  {(['technicians', 'customers', 'individual'] as const).map((t) => (
                    <button key={t} onClick={() => setAnnouncementTarget(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${announcementTarget === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t === 'individual' ? 'Individual Technician' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual technician selector */}
              {announcementTarget === 'individual' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Technician</label>
                  <select value={announcementTechId} onChange={(e) => setAnnouncementTechId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white">
                    <option value="">Choose a technician...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.city})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input type="text" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
                <textarea value={announcementMsg} onChange={(e) => setAnnouncementMsg(e.target.value)}
                  placeholder="Type your announcement message..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none" />
              </div>

              {announcementResult && (
                <div className={'rounded-xl p-3 text-sm ' + (announcementResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                  {announcementResult.text}
                </div>
              )}

              <button
                onClick={async () => {
                  if (!announcementTitle.trim() || !announcementMsg.trim()) {
                    setAnnouncementResult({ type: 'error', text: 'Please enter both title and message.' });
                    return;
                  }
                  setAnnouncementSending(true);
                  setAnnouncementResult(null);
                  try {
                    let count = 0;
                    if (announcementTarget === 'technicians') {
                      count = await sendAnnouncementToTechnicians(technicians, announcementTitle, announcementMsg);
                    } else if (announcementTarget === 'individual') {
                      if (!announcementTechId) {
                        setAnnouncementResult({ type: 'error', text: 'Please select a technician.' });
                        setAnnouncementSending(false);
                        return;
                      }
                      count = await sendAnnouncementToTechnicians(
                        technicians.filter((t) => t.id === announcementTechId),
                        announcementTitle, announcementMsg,
                      );
                    } else {
                      // customers — get all unique mobile numbers from bookings
                      const mobiles = [...new Set(bookings.map((b) => b.mobile_number))];
                      count = await sendAnnouncementToCustomers(mobiles, announcementTitle, announcementMsg);
                    }
                    setAnnouncementResult({ type: 'success', text: `Announcement sent to ${count} recipient${count !== 1 ? 's' : ''}.` });
                    setAnnouncementTitle('');
                    setAnnouncementMsg('');
                    await loadNotifLogs();
                  } catch {
                    setAnnouncementResult({ type: 'error', text: 'Failed to send announcement. Please try again.' });
                  }
                  setAnnouncementSending(false);
                }}
                disabled={announcementSending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {announcementSending ? <Loader size={16} className="animate-spin" /> : <Bell size={16} />}
                Send Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Service Pricing</h2>
            <p className="text-gray-500 text-sm">Edit base price, GST, platform fee, and commission for each service. Changes take effect immediately for new bookings.</p>
          </div>

          {priceMsg && (
            <div className={'rounded-xl p-3 text-sm ' + (priceMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
              {priceMsg.text}
            </div>
          )}

          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Service</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Base Price</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">GST %</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Platform Fee</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Commission %</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Active</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePrices
                    .filter((p) => p.service_name.toLowerCase().includes(priceSearch.toLowerCase()))
                    .map((p) => {
                      const edit = priceEdits[p.id] ?? { base_price: String(p.base_price), gst_rate: String(p.gst_rate), platform_fee: String(p.platform_fee), commission_rate: String(p.commission_rate), is_active: p.is_active };
                      const breakdown: PricingBreakdown = getPricingFromServicePrice({
                        ...p,
                        base_price: Number(edit.base_price) || 0,
                        gst_rate: Number(edit.gst_rate) || 0,
                        platform_fee: Number(edit.platform_fee) || 0,
                        commission_rate: Number(edit.commission_rate) || 0,
                      });
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{p.service_name}</td>
                          <td className="px-4 py-3">
                            <input type="number" value={edit.base_price} onChange={(e) => setPriceEdits((prev) => ({ ...prev, [p.id]: { ...edit, base_price: e.target.value } }))}
                              className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" step="0.01" value={edit.gst_rate} onChange={(e) => setPriceEdits((prev) => ({ ...prev, [p.id]: { ...edit, gst_rate: e.target.value } }))}
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" value={edit.platform_fee} onChange={(e) => setPriceEdits((prev) => ({ ...prev, [p.id]: { ...edit, platform_fee: e.target.value } }))}
                              className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" step="0.01" value={edit.commission_rate} onChange={(e) => setPriceEdits((prev) => ({ ...prev, [p.id]: { ...edit, commission_rate: e.target.value } }))}
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-right" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setPriceEdits((prev) => ({ ...prev, [p.id]: { ...edit, is_active: !edit.is_active } }))}
                              className={'w-10 h-6 rounded-full transition-colors ' + (edit.is_active ? 'bg-green-500' : 'bg-gray-300')}>
                              <span className={'block w-4 h-4 bg-white rounded-full transition-transform ' + (edit.is_active ? 'translate-x-5' : 'translate-x-1')} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700 text-sm">{formatINR(breakdown.totalAmount)}</td>
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
                const updates = Object.entries(priceEdits).map(([id, edit]) =>
                  supabase.from('service_prices').update({
                    base_price: Number(edit.base_price) || 0,
                    gst_rate: Number(edit.gst_rate) || 0,
                    platform_fee: Number(edit.platform_fee) || 0,
                    commission_rate: Number(edit.commission_rate) || 0,
                    is_active: edit.is_active,
                    updated_at: new Date().toISOString(),
                  }).eq('id', id),
                );
                const results = await Promise.all(updates);
                const failed = results.filter((r) => r.error);
                if (failed.length > 0) {
                  setPriceMsg({ type: 'error', text: `${failed.length} service(s) failed to save.` });
                } else {
                  setPriceMsg({ type: 'success', text: 'All service prices updated successfully!' });
                  await loadServicePrices();
                }
              } catch {
                setPriceMsg({ type: 'error', text: 'Failed to save prices. Please try again.' });
              }
              setPriceSaving(false);
            }}
            disabled={priceSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
            {priceSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      )}

      {tab === 'ai-dashboard' && <AdminAIDashboard />}
      {tab === 'crm' && <AdminCRM />}
      {tab === 'content' && <AdminContent />}
      {tab === 'coupons' && <AdminCoupons />}
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

function MetricCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: 'blue' | 'green' | 'purple' | 'amber' }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}
