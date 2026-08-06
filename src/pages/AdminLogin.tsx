import { useState } from 'react';
import { Lock, Loader } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:`${window.location.origin}#/admin-dashboard`,
    },
  });

  if (error) {
    console.error(error);
  }
};


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user) {
      setError("Invalid email or password.");
      return;
    }

    sessionStorage.setItem("vattams_admin", "logged_in");
    navigate("admin-dashboard");

  } catch (err) {
    console.error(err);
    setError("Unable to connect to the server.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt="VATTAMS HOME SERVICES"
              className="h-20 w-auto mx-auto mb-4 rounded-xl"
            />
            <h1 className="text-2xl font-extrabold text-white mb-1">Admin Login</h1>
            <p className="text-blue-200 text-sm">Access the admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                placeholder="admin@vattams.net"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <Lock size={16} className="absolute right-3 top-3.5 text-blue-200/50" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {loading ? <Loader size={18} className="animate-spin" /> : 'Sign In'}
            </button>
            <button onClick={signInWithGoogle}>
  Sign in with Google
</button>
          </form>
        </div>
      </div>
    </div>
  );
  }
