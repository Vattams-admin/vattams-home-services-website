import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  AlertCircle,
  Loader,
  RefreshCw,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase, Technician } from '@/lib/supabase';

// This page is the "Application Status" screen in the required onboarding
// flow: Login -> Application Status -> Pending / Approved / Rejected.
//
// It always re-reads the technician row from the database (never from
// sessionStorage/localStorage) so status changes made by an admin show up
// immediately on refresh or re-login, as required.
export default function TechnicianApplicationStatus() {
  const { navigate } = useRouter();

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const storedId =
        sessionStorage.getItem('vattams_technician_id') ||
        sessionStorage.getItem('technician_id');

      const storedMobile =
        sessionStorage.getItem('vattams_technician_mobile') ||
        sessionStorage.getItem('technician_mobile');

      if (!storedId && !storedMobile) {
        setTechnician(null);
        setError('Please login to check your application status.');
        return;
      }

      const query = storedId
        ? supabase.from('technicians').select('*').eq('id', storedId)
        : supabase.from('technicians').select('*').eq('mobile', storedMobile as string);

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw new Error(fetchError.message);

      if (!data) {
        setTechnician(null);
        setError('We could not find your application. Please login again.');
        return;
      }

      if (data.id) {
        sessionStorage.setItem('vattams_technician_id', data.id);
      }

      setTechnician(data as Technician);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your application status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    sessionStorage.removeItem('vattams_technician_id');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('vattams_technician_mobile');
    sessionStorage.removeItem('technician_mobile');
    navigate('technician-login');
  };

  if (loading) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={26} className="text-orange-500 animate-spin" />
          </div>
          <h2 className="font-bold text-gray-900">Checking your application status</h2>
          <p className="text-sm text-gray-500 mt-1">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || 'Please login to check your application status.'}
          </p>
          <button
            onClick={() => navigate('technician-login')}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
          >
            Go to Technician Login
          </button>
        </div>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { icon: typeof Clock; color: string; bg: string; title: string; message: string }
  > = {
    pending: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      title: 'Application Pending Review',
      message:
        'Thanks for registering with VATTAMS! Our admin team is reviewing your details and documents. This usually takes 24–48 hours. You will be able to log in to your Technician Dashboard as soon as you are approved.',
    },
    active: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-100',
      title: 'Application Approved',
      message:
        'Congratulations! Your technician application has been approved. You now have full access to your Technician Dashboard.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
      title: 'Application Rejected',
      message:
        technician.rejection_reason ||
        'Unfortunately your application was not approved at this time. Please contact VATTAMS support for more information.',
    },
    suspended: {
      icon: Lock,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-100',
      title: 'Account Suspended',
      message:
        technician.suspend_reason ||
        'Your technician account has been suspended. Please contact VATTAMS support for more information.',
    },
    inactive: {
      icon: AlertCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50 border-gray-100',
      title: 'Account Inactive',
      message: 'Your technician account is currently inactive. Please contact VATTAMS support.',
    },
  };

  const config = statusConfig[technician.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div
            className={`w-20 h-20 rounded-full ${config.bg} border flex items-center justify-center mx-auto mb-6`}
          >
            <Icon size={40} className={config.color} />
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{config.title}</h1>

          <p className="text-gray-500 mb-2">
            Hi <span className="font-semibold text-gray-700">{technician.full_name}</span>
          </p>

          <div className={`text-left rounded-xl border p-4 mb-6 ${config.bg}`}>
            <p className={`text-sm leading-6 ${config.color} font-medium`}>{config.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left text-sm mb-6">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">Mobile</div>
              <div className="font-semibold text-gray-800">{technician.mobile}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">City</div>
              <div className="font-semibold text-gray-800">{technician.city}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <div className="text-xs text-gray-400 mb-0.5">Current Status</div>
              <div className={`font-bold capitalize ${config.color}`}>{technician.status}</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {technician.status === 'active' && (
              <button
                onClick={() => navigate('technician-dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
              >
                Go to Technician Dashboard
                <ArrowRight size={16} />
              </button>
            )}

            <button
              onClick={() => fetchStatus(false)}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              {refreshing ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh Status
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}