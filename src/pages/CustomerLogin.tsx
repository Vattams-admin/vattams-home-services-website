import { useState } from 'react';
import { Loader, Phone, Lock, LogIn } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { initFCM, registerServiceWorker } from '@/lib/fcm';
export default function CustomerLogin() {
  const { navigate } = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Login failed');

      sessionStorage.setItem('vattams_customer', JSON.stringify(data.customer));
      sessionStorage.setItem('vattams_customer_session', data.sessionToken);
      sessionStorage.setItem('vattams_customer_expires', data.expiresAt);
      void registerServiceWorker();
      void initFCM('customer', data.customer.mobile);
      navigate('customer-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
    setLoading(false);
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleLogin} className="bg-white rounded-3xl border border-gold-200/70 shadow-[0_18px_50px_rgba(5,10,23,0.08)] p-6 md:p-7 space-y-4">
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10}
              placeholder="10-digit Mobile Number"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
            {loading ? <Loader size={18} className="animate-spin" /> : <LogIn size={18} />} Login
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => navigate('customer-register')} className="text-gold-700 font-semibold hover:text-gold-800 hover:underline">Create Account</button>
            <button type="button" onClick={() => navigate('customer-forgot')} className="text-gray-500 hover:underline">Forgot Password?</button>
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500">
          <button onClick={() => navigate('booking')} className="hover:underline">Book without an account</button>
        </div>
      </div>
    </div>
  );
}