import { useEffect, useState, useCallback } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  BadgeCheck,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { downloadStudentConfirmation } from '@/lib/onboardingLetter';

type TuitionStudentStatus = 'pending' | 'approved' | 'rejected';

interface TuitionStudent {
  id: string;
  student_id: string | null;
  student_name: string;
  parent_name: string;
  phone: string;
  email: string;
  city: string;
  course: string;
  class_mode: string;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: TuitionStudentStatus;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

function getAdminId(): string | null {
  // Matches the session format set by src/pages/AdminLogin.tsx —
  // sessionStorage.setItem('vattams_admin', adminRow.id).
  return sessionStorage.getItem('vattams_admin');
}

function StatusBadge({ status }: { status: TuitionStudentStatus }) {
  const styles: Record<TuitionStudentStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function TuitionAdminStudents() {
  const [students, setStudents] = useState<TuitionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [selected, setSelected] = useState<TuitionStudent | null>(null);
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    const adminId = getAdminId();

    if (!adminId) {
      setError('Your admin session could not be verified. Please log in again.');
      setLoading(false);
      return;
    }

    setError('');

    const { data, error: rpcError } = await supabase.rpc(
      'admin_list_tuition_students',
      {
        p_admin_id: adminId,
        p_status: null,
      }
    );

    if (rpcError) {
      console.error('[TuitionAdminStudents] admin_list_tuition_students error:', rpcError);
      setError('Could not load student registrations. Please try again.');
      setLoading(false);
      return;
    }

    setStudents((data ?? []) as TuitionStudent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStudents();

    const pollInterval = window.setInterval(() => {
      loadStudents();
    }, 20000);

    return () => window.clearInterval(pollInterval);
  }, [loadStudents]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const adminId = getAdminId();

    if (!adminId) {
      setActionError('Your admin session could not be verified. Please log in again.');
      return;
    }

    setUpdatingId(id);
    setActionError('');

    const { data, error: rpcError } = await supabase.rpc(
      'admin_update_tuition_student_status',
      {
        p_admin_id: adminId,
        p_student_id: id,
        p_status: status,
      }
    );

    if (rpcError) {
      console.error('[TuitionAdminStudents] admin_update_tuition_student_status error:', rpcError);
      setActionError('Could not update this registration. Please try again.');
      setUpdatingId(null);
      return;
    }

    const updatedRow = Array.isArray(data) ? data[0] : data;

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...(updatedRow ?? { status }) } : s))
    );

    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, ...(updatedRow ?? { status }) } : prev
    );
    setUpdatingId(null);
  };

  const counts = {
    pending: students.filter((s) => s.status === 'pending').length,
    approved: students.filter((s) => s.status === 'approved').length,
    rejected: students.filter((s) => s.status === 'rejected').length,
    all: students.length,
  };

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'all', label: 'All', count: counts.all },
  ];

  const filtered = filter === 'all' ? students : students.filter((s) => s.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading student registrations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === f.id
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadStudents();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-gray-200 text-center">
          <Users className="mx-auto mb-3 text-gray-300" size={28} />
          <p className="text-sm text-gray-500">No {filter === 'all' ? '' : filter} student registrations yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Student ID</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Parent / Guardian</th>
                <th className="px-4 py-3 font-semibold">Mobile</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    {s.student_id ? (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-700">
                        <BadgeCheck size={12} />
                        {s.student_id}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.student_name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.parent_name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}</td>
                  <td className="px-4 py-3 text-gray-600">{s.course}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(s.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100"
                      >
                        View
                      </button>
                      {s.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={updatingId === s.id}
                          onClick={() => updateStatus(s.id, 'approved')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          Approve
                        </button>
                      )}
                      {s.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={updatingId === s.id}
                          onClick={() => updateStatus(s.id, 'rejected')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                <h2 className="font-bold text-gray-900">Student Registration</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{selected.student_name}</h3>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-sm text-gray-500">{selected.course}</p>
                {selected.student_id && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-extrabold">
                    <BadgeCheck size={12} />
                    {selected.student_id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Parent / Guardian</p>
                    <p className="font-medium text-gray-900">{selected.parent_name}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <Phone size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Mobile</p>
                    <p className="font-medium text-gray-900">{selected.phone}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <Mail size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Email</p>
                    <p className="font-medium text-gray-900 break-all">{selected.email}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <MapPin size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">City</p>
                    <p className="font-medium text-gray-900">{selected.city}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <BookOpen size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Class Mode</p>
                    <p className="font-medium text-gray-900">{selected.class_mode}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <CalendarDays size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Preferred Date</p>
                    <p className="font-medium text-gray-900">{selected.preferred_date || '—'}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <Clock3 size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Preferred Time</p>
                    <p className="font-medium text-gray-900">{selected.preferred_time || '—'}</p>
                  </div>
                </div>
              </div>

              {selected.message && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Additional Message</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.message}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {selected.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, 'approved')}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} />
                    Approve
                  </button>
                )}
                {selected.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, 'rejected')}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                )}
              </div>

              {selected.student_id && (
                <button
                  type="button"
                  onClick={() =>
                    downloadStudentConfirmation({
                      studentId: selected.student_id!,
                      studentName: selected.student_name,
                      parentName: selected.parent_name,
                      city: selected.city,
                      phone: selected.phone,
                      email: selected.email,
                      course: selected.course,
                      classMode: selected.class_mode,
                      registeredOn: selected.created_at,
                    })
                  }
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Download size={16} /> Download Confirmation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}