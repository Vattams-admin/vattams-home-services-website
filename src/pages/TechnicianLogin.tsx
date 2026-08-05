import { useState } from 'react';
import { Lock, Loader, Eye, EyeOff, Phone, Mail, AlertCircle, Wrench } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Technician } from '@/lib/supabase';
import { initFCM, registerServiceWorker } from '@/lib/fcm';

export default function TechnicianLogin() {
  const { navigate } = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabaseUrl = 'https://nitlpxztktgjcjxdgiqm.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdGxweHp0a3RnamNqeGRnaXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODM5ODcsImV4cCI6MjEwMDc1OTk4N30.mKbYeKEf7u2DjDpPtiVmNasfEx7sH0nwuuNrN_30GiM';

      const response = await fetch(`${supabaseUrl}/functions/v1/technician-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      const technician = data.technician as Technician;
      sessionStorage.setItem('vattams_tech_id', technician.id);
      sessionStorage.setItem('vattams_tech_data', JSON.stringify(technician));
      void registerServiceWorker();
      void initFCM('technician', technician.id);
      navigate('technician-dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="VATTAMS HOME SERVICES" className="h-20 w-auto mx-auto mb-4 rounded-xl" />
            <div className="inline-flex items-center gap-2 text-blue-200 text-sm font-semibold mb-2">
              <Wrench size={16} /> Technician Portal
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Technician Login</h1>
            <p className="text-blue-200 text-sm">
  Login using your registered mobile number or email address and password.
</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Mobile Number or Email</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-blue-200/50">
                  {identifier.includes('@') ? <Mail size={16} /> : <Phone size={16} />}
                </span>
                <input
                  type="text" required value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                  placeholder="e.g. 9876543210 or you@example.com"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-blue-200/50 hover:text-blue-200">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : <><Lock size={16} /> Sign In</>}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-blue-200/60 text-xs">
              Only approved technicians can access the Technician Dashboard. If your application is under review, please wait for admin approval.
            </p>
            <p className="text-blue-200/50 text-xs">
              New to VATTAMS?{' '}
              <button onClick={() => navigate('technician-register')} className="text-blue-300 underline font-medium">
                Register as a Technician
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
