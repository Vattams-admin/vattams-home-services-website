import { useState, useEffect, useRef } from 'react';
import { Loader, User, Phone, Mail, MapPin, Home, Save, LogOut, Calendar, Briefcase, CheckCircle, Lock, Key } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Customer } from '@/lib/supabase';
import { customerData } from '@/lib/customerData';

const SUPABASE_URL = 'https://nfcibyprftnowaiwlxxc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2lieXByZnRub3dhaXdseHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODMzOTgsImV4cCI6MjA5OTQ1OTM5OH0.5ZMjWYOuRBKNKG3ZonXXOBAfBapm54naphNXrHxq16k';
export default function CustomerProfile() {
  const { navigate } = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', city: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [bookingCountError, setBookingCountError] = useState(false);
  const [bookingCountLoading, setBookingCountLoading] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const bookingCountRequestVersion = useRef(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_customer');
    const sessionToken = sessionStorage.getItem('vattams_customer_session');
    const expiresAt = sessionStorage.getItem('vattams_customer_expires');

    const clearCustomerSession = () => {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
    };

    if (!stored || !sessionToken || !expiresAt) {
      clearCustomerSession();
      navigate('customer-login');
      setLoading(false);
      return;
    }

    const expiry = Number(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      clearCustomerSession();
      navigate('customer-login');
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<Customer>;
      if (typeof parsed.id !== 'string' || !parsed.id.trim() ||
          typeof parsed.mobile !== 'string' || !parsed.mobile.trim() ||
          typeof parsed.full_name !== 'string' || !parsed.full_name.trim() ||
          (parsed.email != null && typeof parsed.email !== 'string') ||
          (parsed.city != null && typeof parsed.city !== 'string') ||
          (parsed.address != null && typeof parsed.address !== 'string') ||
          (parsed.created_at != null && (typeof parsed.created_at !== 'string' || !Number.isFinite(Date.parse(parsed.created_at))))) {
        throw new Error('Stored customer profile is incomplete.');
      }
      const c = parsed as Customer;
      setCustomer(c);
      setForm({ full_name: c.full_name, email: c.email ?? '', city: c.city ?? '', address: c.address ?? '' });
      void loadBookingCount(c.id);
    } catch {
      clearCustomerSession();
      navigate('customer-login');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => {
    bookingCountRequestVersion.current += 1;
  }, []);

  const loadBookingCount = async (_customerId: string) => {
    const requestVersion = ++bookingCountRequestVersion.current;
    setBookingCountError(false);
    setBookingCountLoading(true);
    try {
      const result = await customerData<{ bookings: { id: string }[] }>('bookings');
      if (!result || !Array.isArray(result.bookings) ||
          !result.bookings.every((booking) => booking && typeof booking.id === 'string')) {
        throw new Error('Booking count response is unavailable.');
      }
      if (requestVersion !== bookingCountRequestVersion.current) return;
      setBookingCount(result.bookings.length);
      setBookingCountError(false);
    } catch {
      if (requestVersion !== bookingCountRequestVersion.current) return;
      // Keep the count unknown: a failed request is not proof of zero bookings.
      setBookingCount(null);
      setBookingCountError(true);
    } finally {
      if (requestVersion === bookingCountRequestVersion.current) setBookingCountLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !customer) return;
    setMsg(null);

    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const city = form.city.trim();
    const address = form.address.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      setMsg({ type: 'error', text: 'Full name must be between 2 and 100 characters.' });
      return;
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (city.length > 100 || address.length > 500) {
      setMsg({ type: 'error', text: 'City must be at most 100 characters and address at most 500 characters.' });
      return;
    }
    const sessionToken = sessionStorage.getItem('vattams_customer_session');
    const expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
    if (!sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
      setMsg({ type: 'error', text: 'Your session has expired. Please sign in again.' });
      navigate('customer-login');
      return;
    }

    setSaving(true);
    try {
      const result = await customerData<{ customer: Customer }>('profile', {
        full_name: fullName,
        email,
        city,
        address,
      });
      const updated = result?.customer;
      if (!updated || typeof updated.id !== 'string' || updated.id !== customer.id ||
          typeof updated.full_name !== 'string' || !updated.full_name.trim() ||
          typeof updated.mobile !== 'string' || !updated.mobile.trim()) {
        throw new Error('Profile update could not be confirmed.');
      }
      setCustomer(updated);
      setForm({
        full_name: updated.full_name,
        email: updated.email ?? '',
        city: updated.city ?? '',
        address: updated.address ?? '',
      });
      sessionStorage.setItem('vattams_customer', JSON.stringify(updated));
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMsg({ type: 'error', text: 'Unable to confirm your profile update. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const sessionToken = sessionStorage.getItem('vattams_customer_session') || '';
    // Clear the local session immediately so a network failure cannot leave
    // this browser appearing signed in. The server logout is best-effort.
    sessionStorage.removeItem('vattams_customer');
    sessionStorage.removeItem('vattams_customer_session');
    sessionStorage.removeItem('vattams_customer_expires');
    navigate('home');
    try {
      if (sessionToken) {
        await fetch(SUPABASE_URL + '/functions/v1/customer-auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ session_token: sessionToken }),
        });
      }
    } catch {
      // Local logout is complete; server-side revocation may need retry/login.
    } finally {
      setLoggingOut(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdLoading || !customer) return;
    setPwdMsg(null);
    if (pwdForm.new.length > 128 || pwdForm.confirm.length > 128) {
      setPwdMsg({ type: 'error', text: 'New password must be 128 characters or fewer.' });
      return;
    }
    if (pwdForm.current.length > 128) {
      setPwdMsg({ type: 'error', text: 'Current password must be 128 characters or fewer.' });
      return;
    }
    if (!pwdForm.current) {
      setPwdMsg({ type: 'error', text: 'Enter your current password.' });
      return;
    }
    if (pwdForm.new !== pwdForm.confirm) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwdForm.new.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    const sessionToken = sessionStorage.getItem('vattams_customer_session');
    const expiresAt = Number(sessionStorage.getItem('vattams_customer_expires'));
    if (!sessionToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessionStorage.removeItem('vattams_customer');
      sessionStorage.removeItem('vattams_customer_session');
      sessionStorage.removeItem('vattams_customer_expires');
      setPwdMsg({ type: 'error', text: 'Your session has expired. Please sign in again.' });
      navigate('customer-login');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ session_token: sessionToken, current_password: pwdForm.current, new_password: pwdForm.new }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error || data.success === false) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to confirm password change. Please try again.');
      }
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwdForm({ current: '', new: '', confirm: '' });
      setShowPwdForm(false);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading || !customer) {
    return <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-ivory-50"><Loader className="animate-spin text-gold-700" size={32} /></div>;
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">My Profile</h1>
          <button onClick={handleLogout} disabled={loggingOut} aria-busy={loggingOut} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed text-red-600 text-sm font-semibold rounded-xl transition-colors">
            <LogOut size={16} /> {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3"><Briefcase size={18} className="text-gold-700" /></div>
            <div className="text-2xl font-extrabold text-gray-900">{bookingCount === null ? '—' : bookingCount}</div>
            <div className="text-xs text-gray-400 font-medium">{bookingCountError ? 'Count unavailable' : 'Total Bookings'}</div>
            {bookingCountError && <button type="button" disabled={bookingCountLoading} aria-busy={bookingCountLoading} onClick={() => customer && void loadBookingCount(customer.id)} className="mt-2 text-xs font-semibold text-gold-700 underline disabled:opacity-60 disabled:cursor-not-allowed">{bookingCountLoading ? 'Retrying…' : 'Retry count'}</button>}
          </div>
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-5">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3"><CheckCircle size={18} className="text-green-600" /></div>
            <div className="text-2xl font-extrabold text-gray-900">{customer.mobile}</div>
            <div className="text-xs text-gray-400 font-medium">Mobile Number</div>
          </div>
        </div>

        {msg && <div role={msg.type === 'error' ? 'alert' : 'status'} aria-live={msg.type === 'error' ? 'assertive' : 'polite'} className={'rounded-xl p-3 text-sm mb-4 ' + (msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>{msg.text}</div>}

        <form onSubmit={handleSave} aria-busy={saving} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><User size={22} className="text-gold-700" /></div>
            <div>
              <div className="font-bold text-gray-900">{customer.full_name}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} /> Joined {customer.created_at && Number.isFinite(Date.parse(customer.created_at)) ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'Date unavailable'}</div>
            </div>
          </div>

          <div>
            <label htmlFor="profile-full-name" className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input id="profile-full-name" name="full_name" autoComplete="name" required minLength={2} maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-mobile" className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number (cannot change)</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input id="profile-mobile" name="mobile" autoComplete="tel" value={customer.mobile} disabled className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-ivory-50 text-gray-500 text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input id="profile-email" name="email" autoComplete="email" maxLength={254} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-city" className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input id="profile-city" name="city" autoComplete="address-level2" maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-address" className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
            <div className="relative">
              <Home size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input id="profile-address" name="address" autoComplete="street-address" maxLength={500} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors">
            {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} {saving ? 'Saving changes…' : 'Save Changes'}
          </button>
        </form>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Lock size={16} className="text-gray-400" /> Change Password</h3>
            <button type="button" disabled={pwdLoading} onClick={() => {
              setShowPwdForm((visible) => !visible);
              setPwdMsg(null);
              setPwdForm({ current: '', new: '', confirm: '' });
            }} className="text-sm text-gold-700 font-semibold hover:underline disabled:opacity-60">
              {showPwdForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          {pwdMsg && <div role={pwdMsg.type === 'error' ? 'alert' : 'status'} aria-live={pwdMsg.type === 'error' ? 'assertive' : 'polite'} className={'rounded-xl p-3 text-sm mb-4 ' + (pwdMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>{pwdMsg.text}</div>}
          {showPwdForm && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="profile-current-password" className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input id="profile-current-password" name="current-password" autoComplete="current-password" type="password" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="profile-new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input id="profile-new-password" name="new-password" autoComplete="new-password" type="password" value={pwdForm.new} onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })} required minLength={6} maxLength={128}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="profile-confirm-password" className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input id="profile-confirm-password" name="confirm-password" autoComplete="new-password" type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} required minLength={6} maxLength={128}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
                </div>
              </div>
              <button type="submit" disabled={pwdLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
                {pwdLoading ? <Loader size={18} className="animate-spin" /> : <Key size={18} />} {pwdLoading ? 'Updating password…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <button onClick={() => navigate('customer-dashboard')} className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
          <Briefcase size={18} /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}
