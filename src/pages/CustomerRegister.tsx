import { useEffect, useRef, useState } from 'react';
import { Loader, User, Phone, Lock, Mail, MapPin, Home, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

type Step = 'form' | 'otp' | 'success';

export default function CustomerRegister() {
  const { navigate } = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ full_name: '', mobile: '', password: '', email: '', city: '', address: '' });
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.name === 'mobile'
      ? e.target.value.replace(/\D/g, '').slice(0, 10)
      : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const clearResendTimer = () => {
    if (resendIntervalRef.current !== null) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
  };

  useEffect(() => () => clearResendTimer(), []);

  const startResendTimer = () => {
    clearResendTimer();
    setResendTimer(60);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearResendTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!form.full_name.trim() || !form.mobile.trim() || !form.password.trim() || !form.email.trim()) {
      setError('Name, mobile, password, and email are required. Verify your email OTP to finish registration.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          ...form,
          full_name: form.full_name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim().toLowerCase(),
          city: form.city.trim(),
          address: form.address.trim(),
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'Registration failed. Please try again.');
      }
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!/^\d{6}$/.test(otp.trim())) { setError('Please enter the 6-digit OTP using numbers only.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          mobile: form.mobile.trim(),
          code: otp.trim(),
          purpose: 'registration',
          registration_data: {
            ...form,
            full_name: form.full_name.trim(),
            mobile: form.mobile.trim(),
            email: form.email.trim().toLowerCase(),
            city: form.city.trim(),
            address: form.address.trim(),
          },
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'Verification failed. Please check the OTP and try again.');
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile: form.mobile.trim(), purpose: 'registration' }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'Failed to resend OTP. Please try again.');
      }
      setOtp('');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-ivory-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-950 text-gold-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Customer Portal</div>
          <img src="/logo.svg" alt="VATTAMS" className="h-16 w-auto mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy-950">
            {step === 'form' && 'Create Your Account'}
            {step === 'otp' && 'Verify Your Email'}
            {step === 'success' && 'Welcome to VATTAMS!'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'form' && 'Register to book and track service requests'}
            {step === 'otp' && `Enter the 6-digit code sent to ${form.email.trim().toLowerCase()}`}
            {step === 'success' && 'Your account has been created successfully'}
          </p>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        {step === 'form' && (
          <form onSubmit={handleRegister} aria-busy={loading} className="bg-white rounded-3xl border border-gold-200/70 shadow-[0_18px_50px_rgba(5,10,23,0.08)] p-6 md:p-7 space-y-4">
            <Input icon={User} name="full_name" placeholder="Full Name *" value={form.full_name} onChange={handleChange} maxLength={100} />
            <Input icon={Phone} name="mobile" type="tel" placeholder="10-digit Mobile Number *" value={form.mobile} onChange={handleChange} maxLength={10} />
            <Input icon={Lock} name="password" type="password" autoComplete="new-password" placeholder="Password (min 6 chars) *" value={form.password} onChange={handleChange} minLength={6} maxLength={128} />
            <Input icon={Mail} name="email" type="email" placeholder="Email address *" required value={form.email} onChange={handleChange} maxLength={254} />
            <Input icon={MapPin} name="city" placeholder="City (optional)" value={form.city} onChange={handleChange} />
            <Input icon={Home} name="address" placeholder="Address (optional)" value={form.address} onChange={handleChange} />
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Send Email OTP
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('customer-login')} className="text-gold-700 font-semibold hover:text-gold-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Login</button>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} aria-busy={loading} className="bg-white rounded-3xl border border-gold-200/70 shadow-[0_18px_50px_rgba(5,10,23,0.08)] p-6 md:p-7 space-y-4">
            <Input icon={KeyRound} name="otp" placeholder="6-digit email OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" />
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Verify Email & Create Account
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('form')} className="text-gray-500 hover:underline">Back</button>
              {resendTimer > 0 ? (
                <span className="text-gray-400">Resend in {resendTimer}s</span>
              ) : (
                <button type="button" onClick={handleResendOtp} disabled={loading || resendTimer > 0} className="text-gold-700 font-semibold hover:text-gold-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">Resend OTP</button>
              )}
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gold-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-gold-700" />
            </div>
            <p className="text-gray-600 mb-6">You can now book services, track bookings, and manage your profile.</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('customer-login')} className="flex-1 py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold rounded-xl transition-colors">Login Now</button>
              <button onClick={() => navigate('home')} className="flex-1 py-3 bg-navy-50 hover:bg-navy-100 text-navy-800 font-semibold rounded-xl transition-colors">Go Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ icon: Icon, ...props }: { icon: typeof User } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-3.5 text-gray-400" />
      <input {...props} onChange={props.onChange}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
    </div>
  );
}
