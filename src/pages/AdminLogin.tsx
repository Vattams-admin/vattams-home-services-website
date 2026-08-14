import { useState } from 'react';
import { Lock, Loader, AlertCircle, Mail } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail || !password) {
        setError('Please enter your email and password.');
        return;
      }

      /*
       * Verify the admin's credentials via the Supabase RPC.
       *
       * verify_admin_login() checks the password hash with pgcrypto's
       * crypt() server-side and only returns a row when
       * role = 'super_admin' AND is_active = true.
       *
       * The admin_users table (including password_hash) is never
       * queried directly from the frontend.
       */
      const { data: admin, error: rpcError } = await supabase.rpc(
        'verify_admin_login',
        {
          p_email: cleanEmail,
          p_password: cleanPassword,
        }
      );

      if (rpcError) {
        console.error('Admin login RPC error:', rpcError);
        setError('Unable to verify admin account. Please try again.');
        return;
      }

      /*
       * The RPC returns either an empty result or a single row,
       * depending on how it's defined (row-returning function).
       * Normalize both shapes safely.
       */
      const adminRow = Array.isArray(admin) ? admin[0] : admin;

      if (!adminRow || !adminRow.id) {
        setError('Invalid admin email or password.');
        return;
      }

      if (adminRow.role !== 'super_admin') {
        setError('This account is not authorized for admin access.');
        return;
      }

      /*
       * Store the custom admin session.
       * This project uses its own sessionStorage-based admin
       * session — NOT supabase.auth — so no Supabase Auth call
       * is made here.
       */
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8-hour session

      sessionStorage.setItem('vattams_admin', adminRow.id);
      sessionStorage.setItem(
        'vattams_admin_email',
        adminRow.email ?? cleanEmail
      );
      sessionStorage.setItem(
        'vattams_admin_expires',
        expiresAt.toISOString()
      );
      sessionStorage.setItem(
        'vattams_admin_role',
        adminRow.role
      );

      if (adminRow.full_name) {
        sessionStorage.setItem(
          'vattams_admin_name',
          adminRow.full_name
        );
      }

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
    <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-4">
      <div className="max-w-md w-full">

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt="VATTAMS HOME SERVICES"
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
              <label className="block text-sm font-medium text-blue-100 mb-1.5">
                Admin Email
              </label>

              <div className="relative">
                <input
                  type="email"
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
              <label className="block text-sm font-medium text-blue-100 mb-1.5">
                Password
              </label>

              <div className="relative">

                <input
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
                />

                <Lock
                  size={16}
                  className="absolute right-3 top-3.5 text-blue-200/50"
                />

              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl px-4 py-3">

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