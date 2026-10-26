import { useState } from 'react';
import { Loader, Phone, Lock, LogIn } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { initFCM, registerServiceWorker } from '@/lib/fcm';
export default function CustomerLogin() {
  const { navigate } = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!mobile.trim() || !password.trim()) { setError('Please enter your mobile number and password.'); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Please enter a valid 10-digit mobile number.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile, password }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Login failed. Please try again.';
        throw new Error(message);
      }
      if (!data || typeof data !== 'object') throw new Error('Login response was invalid. Please try again.');
      const payload = data as { error?: unknown; customer?: unknown; sessionToken?: unknown; expiresAt?: unknown };
      if (payload.error) throw new Error(typeof payload.error === 'string' ? payload.error : 'Login failed. Please try again.');
      if (!payload.customer || typeof payload.customer !== 'object' ||
          typeof payload.sessionToken !== 'string' || !payload.sessionToken.trim() ||
          (typeof payload.expiresAt !== 'string' && typeof payload.expiresAt !== 'number')) {
        throw new Error('Login response was incomplete. Please try again.');
      }
      const customer = payload.customer as { id?: unknown; mobile?: unknown; full_name?: unknown };
      if (typeof customer.id !== 'string' || !customer.id.trim() ||
          typeof customer.mobile !== 'string' || !/^[6-9]\d{9}$/.test(customer.mobile) ||
          typeof customer.full_name !== 'string' || !customer.full_name.trim()) {
        throw new Error('Login response contained an invalid customer profile. Please try again.');
      }
      const expiry = Number(payload.expiresAt);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        throw new Error('Your session could not be verified. Please sign in again.');
      }
      try {
        sessionStorage.setItem('vattams_customer', JSON.stringify(customer));
        sessionStorage.setItem('vattams_customer_session', payload.sessionToken);
        sessionStorage.setItem('vattams_customer_expires', String(expiry));
      } catch {
        // Avoid leaving a partially authenticated client session if storage is unavailable.
        for (const key of ['vattams_customer', 'vattams_customer_session', 'vattams_customer_expires']) {
          try { sessionStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
        }
        throw new Error('Unable to save your sign-in session in this browser. Please enable site storage and try again.');
      }
      void registerServiceWorker();
      void initFCM('customer', customer.mobile);
      navigate('customer-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-950 text-gold-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Customer Portal</div>
          <img src="/logo.svg" alt="VATTAMS" className="h-16 w-auto mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy-950">Customer Login</h1>
          <p className="text-gray-500 text-sm mt-1">Login to book and track your services</p>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleLogin} aria-busy={loading} className="bg-white rounded-3xl border border-gold-200/70 shadow-[0_18px_50px_rgba(5,10,23,0.08)] p-6 md:p-7 space-y-4">
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input type="tel" name="mobile" aria-label="10-digit mobile number" autoComplete="tel" inputMode="numeric" required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10}
              placeholder="10-digit Mobile Number"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input type="password" name="password" aria-label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
            {loading ? <Loader size={18} className="animate-spin" /> : <LogIn size={18} />} Login
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => navigate('customer-register')} className="text-gold-700 font-semibold hover:text-gold-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Create Account</button>
            <button type="button" onClick={() => navigate('customer-forgot')} className="text-gray-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Forgot Password?</button>
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500">
          <button onClick={() => navigate('booking')} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Book without an account</button>
        </div>
      </div>
    </div>
  );
}