import { useState } from 'react';
import { Lock, Loader, AlertCircle, Mail } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { initFCM } from '@/lib/fcm';
import './AdminLogin.css';

export default function AdminLogin() {
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setError('Please enter your email and password.');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
          },
          // Passwords are opaque credentials: preserve spaces exactly as entered.
          body: JSON.stringify({ email: cleanEmail, password }),
        }
      );

      const parsed: unknown = await response.json().catch(() => null);
      const authData = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
      const admin = authData.admin && typeof authData.admin === 'object' && !Array.isArray(authData.admin)
        ? authData.admin as Record<string, unknown>
        : {};
      const expiryTime = typeof authData.expiresAt === 'string' || typeof authData.expiresAt === 'number'
        ? new Date(authData.expiresAt).getTime()
        : Number.NaN;

      if (!response.ok || typeof authData.sessionToken !== 'string' || !authData.sessionToken.trim()
        || typeof admin.id !== 'string' || !admin.id.trim()
        || !Number.isFinite(expiryTime) || expiryTime <= Date.now()
        || typeof admin.role !== 'string' || !admin.role.trim()) {
        setError(typeof authData.error === 'string' ? authData.error : 'Invalid admin login response or expired session.');
        return;
      }

      const expiresAt = new Date(expiryTime);
      try {
        sessionStorage.setItem('vattams_admin', authData.sessionToken);
        sessionStorage.setItem('vattams_admin_id', admin.id);
        sessionStorage.setItem('vattams_admin_email', typeof admin.email === 'string' ? admin.email : cleanEmail);
        sessionStorage.setItem('vattams_admin_expires', expiresAt.toISOString());
        sessionStorage.setItem('vattams_admin_role', admin.role);
        if (typeof admin.full_name === 'string' && admin.full_name.trim()) {
          sessionStorage.setItem('vattams_admin_name', admin.full_name);
        } else {
          sessionStorage.removeItem('vattams_admin_name');
        }
      } catch {
        for (const key of [
          'vattams_admin',
          'vattams_admin_id',
          'vattams_admin_email',
          'vattams_admin_expires',
          'vattams_admin_role',
          'vattams_admin_name',
        ]) {
          try { sessionStorage.removeItem(key); } catch { /* Browser storage may be blocked. */ }
        }
        throw new Error('Unable to save your admin sign-in session in this browser. Please enable site storage and try again.');
      }
      void initFCM('admin', admin.id);

      /*
       * Go to admin dashboard only after successful RPC
       * verification.
       */
      navigate('admin-dashboard');
    } catch (err) {
      console.error('Admin login exception:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vattams-admin-login pt-20 md:pt-24 min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        <div className="vattams-admin-login-card backdrop-blur-lg rounded-3xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt="VATTAMS Hybrid Service Marketplace"
              className="h-20 w-auto mx-auto mb-4 rounded-xl"
            />

            <h1 className="text-2xl font-extrabold text-white mb-1">
              Admin Login
            </h1>

            <p className="text-blue-200 text-sm">
              Secure access to VATTAMS Admin Dashboard
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-blue-100 mb-1.5">
                Admin Email
              </label>

              <div className="relative">
                <input
                  id="admin-email"
                  type="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                  placeholder="admin@vattams.net"
                  autoComplete="username"
                />

                <Mail
                  size={16}
                  className="absolute right-3 top-3.5 text-blue-200/50"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-blue-100 mb-1.5">
                Password
              </label>

              <div className="relative">

                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  maxLength={128}
                />

                <Lock
                  size={16}
                  className="absolute right-3 top-3.5 text-blue-200/50"
                />

              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" aria-live="assertive" className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl px-4 py-3">

                <AlertCircle
                  size={16}
                  className="shrink-0 mt-0.5"
                />

                <span>{error}</span>

              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >

              {loading ? (
                <>
                  <Loader
                    size={18}
                    className="animate-spin"
                  />

                  Checking account...
                </>
              ) : (
                <>
                  <Lock size={18} />

                  Sign In
                </>
              )}

            </button>

          </form>

          {/* Security note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-blue-200/60">
              Authorized VATTAMS administrators only
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}