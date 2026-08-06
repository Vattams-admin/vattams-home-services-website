import { useState } from 'react';
import { Loader, Phone, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';

const SUPABASE_URL = 'https://nfcibyprftnowaiwlxxc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2lieXByZnRub3dhaXdseHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODMzOTgsImV4cCI6MjA5OTQ1OTM5OH0.5ZMjWYOuRBKNKG3ZonXXOBAfBapm54naphNXrHxq16k';

export default function CustomerForgot() {
  const { navigate } = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Please enter a valid 10-digit mobile number.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send OTP');
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
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
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mobile, code: otp, purpose: 'forgot_password' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Verification failed');
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mobile, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to reset password');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-auth/resend-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mobile, purpose: 'forgot_password' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to resend');
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

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10}
                placeholder="10-digit Mobile Number"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <KeyRound size={18} />} Send OTP
            </button>
            <button type="button" onClick={() => navigate('customer-login')} className="w-full text-center text-sm text-gray-500 hover:underline">Back to Login</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                placeholder="6-digit OTP"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Verify OTP
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('request')} className="text-gray-500 hover:underline">Back</button>
              {resendTimer > 0 ? <span className="text-gray-400">Resend in {resendTimer}s</span>
                : <button type="button" onClick={handleResendOtp} className="text-blue-600 font-semibold hover:underline">Resend OTP</button>}
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Reset Password
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <button onClick={() => navigate('customer-login')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">Login Now</button>
          </div>
        )}
      </div>
    </div>
  );
}
