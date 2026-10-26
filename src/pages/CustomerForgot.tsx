import { useEffect, useRef, useState } from 'react';
import { Loader, Phone, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

type Step = 'request' | 'otp' | 'reset' | 'done';


export default function CustomerForgot() {
  const { navigate } = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResendTimer = () => {
    if (resendIntervalRef.current !== null) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
  };

  useEffect(() => () => clearResendTimer(), []);

  const startResendTimer = () => {
    clearResendTimer();
    setResendTimer(30);
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

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const normalizedMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) { setError('Please enter a valid 10-digit mobile number.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'Failed to send OTP. Please try again.');
      }
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const normalizedOtp = otp.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) { setError('Please enter the 6-digit OTP using numbers only.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile: mobile.trim(), code: normalizedOtp, purpose: 'forgot_password' }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'OTP verification failed. Please try again.');
      }
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Password must be at least 6 characters and cannot contain only spaces.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile: mobile.trim(), new_password: newPassword }),
      });
      const data: unknown = await res.json().catch(() => null);
      const responseError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
      if (!res.ok || !data || typeof data !== 'object' || responseError) {
        throw new Error(responseError || 'Password reset failed. Please try again.');
      }
      setNewPassword('');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
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
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ mobile: mobile.trim(), purpose: 'forgot_password' }),
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
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="VATTAMS" className="h-16 w-auto mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl font-extrabold text-gray-900">
            {step === 'request' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Reset Password'}
            {step === 'done' && 'Password Reset!'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'request' && 'Enter your mobile number to receive an OTP'}
            {step === 'otp' && `Enter the 6-digit code sent to ${mobile}`}
            {step === 'reset' && 'Enter your new password'}
            {step === 'done' && 'You can now login with your new password'}
          </p>
        </div>

        {error && <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

        {step === 'request' && (
          <form onSubmit={handleRequest} aria-busy={loading} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 space-y-4">
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="tel" name="mobile" aria-label="10-digit mobile number" autoComplete="tel" inputMode="numeric" required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10}
                placeholder="10-digit Mobile Number"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
              {loading ? <Loader size={18} className="animate-spin" /> : <KeyRound size={18} />} Send OTP
            </button>
            <button type="button" onClick={() => navigate('customer-login')} className="w-full text-center text-sm text-gray-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded">Back to Login</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} aria-busy={loading} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 space-y-4">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input name="otp" aria-label="6-digit OTP" inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6}
                placeholder="6-digit OTP"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Verify OTP
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('request')} className="text-gray-500 hover:underline">Back</button>
              {resendTimer > 0 ? <span className="text-gray-400">Resend in {resendTimer}s</span>
                : <button type="button" onClick={handleResendOtp} disabled={loading || resendTimer > 0} className="text-gold-700 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed">Resend OTP</button>}
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} aria-busy={loading} className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-6 space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="password" name="new-password" aria-label="New password" autoComplete="new-password" required minLength={6} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Reset Password
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-gold-200/60 shadow-[0_12px_35px_rgba(5,10,23,0.06)] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <button onClick={() => navigate('customer-login')} className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">Login Now</button>
          </div>
        )}
      </div>
    </div>
  );
}
