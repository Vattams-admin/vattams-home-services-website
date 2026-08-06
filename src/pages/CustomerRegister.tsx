import { useState } from 'react';
import { Loader, User, Phone, Lock, Mail, MapPin, Home, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';

const SUPABASE_URL = 'https://nfcibyprftnowaiwlxxc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2lieXByZnRub3dhaXdseHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODMzOTgsImV4cCI6MjA5OTQ1OTM5OH0.5ZMjWYOuRBKNKG3ZonXXOBAfBapm54naphNXrHxq16k';
type Step = 'form' | 'otp' | 'success';

export default function CustomerRegister() {
  const { navigate } = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ full_name: '', mobile: '', password: '', email: '', city: '', address: '' });
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim() || !form.mobile.trim() || !form.password.trim()) {
      setError('Please fill in all required fields.');
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
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          mobile: form.mobile,
          code: otp,
          purpose: 'registration',
          registration_data: form,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Verification failed');
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mobile: form.mobile, purpose: 'registration' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to resend OTP');
      setOtp('');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    }
    setLoading(false);
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="VATTAMS" className="h-16 w-auto mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl font-extrabold text-gray-900">
            {step === 'form' && 'Create Your Account'}
            {step === 'otp' && 'Verify Your Mobile'}
            {step === 'success' && 'Welcome to VATTAMS!'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'form' && 'Register to book and track home services'}
            {step === 'otp' && `Enter the 6-digit code sent to ${form.mobile}`}
            {step === 'success' && 'Your account has been created successfully'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        {step === 'form' && (
          <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <Input icon={User} name="full_name" placeholder="Full Name *" value={form.full_name} onChange={handleChange} />
            <Input icon={Phone} name="mobile" type="tel" placeholder="10-digit Mobile Number *" value={form.mobile} onChange={handleChange} maxLength={10} />
            <Input icon={Lock} name="password" type="password" placeholder="Password (min 6 chars) *" value={form.password} onChange={handleChange} />
            <Input icon={Mail} name="email" type="email" placeholder="Email (optional)" value={form.email} onChange={handleChange} />
            <Input icon={MapPin} name="city" placeholder="City (optional)" value={form.city} onChange={handleChange} />
            <Input icon={Home} name="address" placeholder="Address (optional)" value={form.address} onChange={handleChange} />
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Send OTP & Register
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('customer-login')} className="text-blue-600 font-semibold hover:underline">Login</button>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <Input icon={KeyRound} name="otp" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Verify & Create Account
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('form')} className="text-gray-500 hover:underline">Back</button>
              {resendTimer > 0 ? (
                <span className="text-gray-400">Resend in {resendTimer}s</span>
              ) : (
                <button type="button" onClick={handleResendOtp} className="text-blue-600 font-semibold hover:underline">Resend OTP</button>
              )}
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <p className="text-gray-600 mb-6">You can now book services, track bookings, and manage your profile.</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('customer-login')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">Login Now</button>
              <button onClick={() => navigate('home')} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">Go Home</button>
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
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
    </div>
  );
}
