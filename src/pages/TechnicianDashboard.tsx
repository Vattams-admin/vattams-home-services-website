import { useState, useEffect, useMemo } from 'react';
import {
  Loader, Wrench, MapPin, Phone, DollarSign, TrendingUp, CheckCircle,
  Clock, Camera, FileSignature, LogOut, Briefcase, Star,
} from 'lucide-react';
import { supabase, Technician, TechnicianJob, Booking, JobStatus } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const jobStatusColors: Record<string, string> = {
  assigned: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function TechnicianDashboard() {
  const { navigate } = useRouter();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [jobs, setJobs] = useState<(TechnicianJob & { booking?: Booking })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileInput, setMobileInput] = useState('');
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('vattams_tech_id');
    if (stored) {
      setMobileInput(stored);
      loadTechnician(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const loadTechnician = async (idOrMobile: string) => {
    let query = supabase.from('technicians').select('*');
    // Try by ID first, then by mobile
    const { data: byId } = await supabase.from('technicians').select('*').eq('id', idOrMobile).maybeSingle();
    if (byId) {
      setTechnician(byId);
      sessionStorage.setItem('vattams_tech_id', byId.id);
      setShowLogin(false);
      await loadJobs(byId.id);
      setLoading(false);
      return;
    }
    const { data: byMobile } = await supabase.from('technicians').select('*').eq('mobile', idOrMobile).maybeSingle();
    if (byMobile) {
      setTechnician(byMobile);
      sessionStorage.setItem('vattams_tech_id', byMobile.id);
      setShowLogin(false);
      await loadJobs(byMobile.id);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const loadJobs = async (techId: string) => {
    const { data: jobsData } = await supabase
      .from('technician_jobs')
      .select('*')
      .eq('technician_id', techId)
      .order('assigned_at', { ascending: false });
    if (!jobsData) { setJobs([]); return; }
    // Fetch related bookings
    const bookingIds = jobsData.map((j) => j.booking_id);
    const { data: bookingsData } = await supabase.from('bookings').select('*').in('id', bookingIds);
    const bookingMap = new Map((bookingsData ?? []).map((b) => [b.id, b]));
    setJobs(jobsData.map((j) => ({ ...j, booking: bookingMap.get(j.booking_id) })));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileInput.length < 10) return;
    setLoading(true);
    loadTechnician(mobileInput);
  };

  const updateJobStatus = async (jobId: string, status: JobStatus) => {
    setUpdatingId(jobId);
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('technician_jobs').update(updates).eq('id', jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    setUpdatingId(null);
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      active: jobs.filter((j) => j.status === 'accepted' || j.status === 'in_progress' || j.status === 'assigned').length,
      earnings: jobs.filter((j) => j.status === 'completed').reduce((s, j) => s + (j.job_amount ?? 0), 0),
    };
  }, [jobs]);

  const logout = () => {
    sessionStorage.removeItem('vattams_tech_id');
    setTechnician(null);
    setShowLogin(true);
    setJobs([]);
    navigate('home');
  };

  if (loading) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (showLogin || !technician) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <img
              src="/logo.svg"
              alt="VATTAMS HOME SERVICES"
              className="h-20 w-auto mx-auto mb-4 rounded-xl"
            />
            <h1 className="text-2xl font-extrabold text-white mb-1">Technician Portal</h1>
            <p className="text-blue-200 text-sm">Enter your registered mobile number to access your dashboard.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-blue-200/50" />
              <input
                type="tel" required pattern="[0-9]{10}" value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none transition-all"
                placeholder="10-digit mobile number"
              />
            </div>
            <button type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
              Sign In
            </button>
          </form>
          <p className="text-center text-blue-200/50 text-xs mt-4">
            Don't have an account?{' '}
            <button onClick={() => navigate('technician-register')} className="text-blue-300 underline">
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="VATTAMS" className="h-14 w-auto rounded-xl" />
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">{technician.full_name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={13} /> {technician.city}
                <span className="text-gray-300">|</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  technician.status === 'active' ? 'bg-green-100 text-green-700' :
                  technician.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{technician.status}</span>
                {technician.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Star size={12} className="fill-amber-400" /> {technician.rating}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Briefcase, label: 'Total Jobs', value: stats.total, color: 'bg-blue-600' },
            { icon: Clock, label: 'Active Jobs', value: stats.active, color: 'bg-amber-500' },
            { icon: CheckCircle, label: 'Completed', value: stats.completed, color: 'bg-green-500' },
            { icon: DollarSign, label: 'Earnings', value: `₹${stats.earnings.toLocaleString('en-IN')}`, color: 'bg-emerald-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-extrabold text-gray-900 text-lg mb-4">Your Jobs</h2>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No jobs assigned yet. Check back later.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  {job.booking && (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs text-gray-400 font-medium">Booking</div>
                          <div className="font-bold text-blue-700 text-sm">{job.booking.booking_number}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${jobStatusColors[job.status]}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Wrench size={14} className="text-gray-400" /> {job.booking.service_category}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin size={14} className="text-gray-400" /> {job.booking.city}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={14} className="text-gray-400" /> {job.booking.mobile_number}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <TrendingUp size={14} className="text-gray-400" /> {job.booking.customer_name}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Address</div>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{job.booking.address}</div>
                      </div>
                      {job.booking.problem_description && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Problem</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{job.booking.problem_description}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {job.status === 'assigned' && (
                          <>
                            <button onClick={() => updateJobStatus(job.id, 'accepted')} disabled={updatingId === job.id}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                              Accept Job
                            </button>
                            <button onClick={() => updateJobStatus(job.id, 'rejected')} disabled={updatingId === job.id}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        {job.status === 'accepted' && (
                          <button onClick={() => updateJobStatus(job.id, 'in_progress')} disabled={updatingId === job.id}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                            Start Work
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button onClick={() => updateJobStatus(job.id, 'completed')} disabled={updatingId === job.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                            Mark Complete
                          </button>
                        )}
                      </div>

                      {/* Photo & Signature placeholders */}
                      {(job.status === 'in_progress' || job.status === 'completed') && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Camera size={16} className="text-gray-400" />
                            {job.service_photo_urls.length} photo(s)
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <FileSignature size={16} className="text-gray-400" />
                            {job.customer_signature ? 'Signed' : 'Pending signature'}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
