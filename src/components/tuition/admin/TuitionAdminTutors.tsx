import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Check,
  Download,
  Loader,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import {
  approveTuitionTutor,
  fetchTuitionTutors,
  rejectTuitionTutor,
  TuitionTutorRow,
  TutorStatusFilter,
} from '@/lib/tuitionTutors';
import { downloadOnboardingLetter } from '@/lib/onboardingLetter';

const FILTERS: { id: TutorStatusFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function TuitionAdminTutors() {
  const [filter, setFilter] = useState<TutorStatusFilter>('pending');
  const [tutors, setTutors] = useState<TuitionTutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [detailsTutor, setDetailsTutor] = useState<TuitionTutorRow | null>(
    null
  );

  const loadTutors = async (status: TutorStatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTuitionTutors(status);
      setTutors(data);
    } catch (err) {
      console.error('[TuitionAdminTutors] load error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load tutor applications.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutors(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (tutor: TuitionTutorRow) => {
    setActioningId(tutor.id);
    try {
      await approveTuitionTutor(tutor.id);
      await loadTutors(filter);
    } catch (err) {
      console.error('[TuitionAdminTutors] approve error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to approve tutor.'
      );
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (tutor: TuitionTutorRow) => {
    setActioningId(tutor.id);
    try {
      await rejectTuitionTutor(tutor.id);
      await loadTutors(filter);
    } catch (err) {
      console.error('[TuitionAdminTutors] reject error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to reject tutor.'
      );
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-200 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => loadTutors(filter)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle
            size={18}
            className="text-red-600 mt-0.5 flex-shrink-0"
          />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader size={18} className="animate-spin" />
          Loading tutor applications...
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <UserCheck size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No {filter !== 'all' ? filter : ''} tutor applications yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Employee ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Subjects</th>
                <th className="px-4 py-3 font-semibold">Experience</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    {tutor.employee_id ? (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700">
                        <BadgeCheck size={12} />
                        {tutor.employee_id}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetailsTutor(tutor)}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                    >
                      {tutor.full_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-gray-400" />
                      {tutor.phone}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-gray-400" />
                      {tutor.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400" />
                      {tutor.city}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tutor.subjects?.length
                      ? tutor.subjects.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tutor.years_experience || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tutor.teaching_mode || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tutor.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        STATUS_STYLES[tutor.status] ??
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tutor.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {tutor.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={actioningId === tutor.id}
                          onClick={() => handleApprove(tutor)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 text-xs font-semibold transition-colors"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      )}
                      {tutor.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={actioningId === tutor.id}
                          onClick={() => handleReject(tutor)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-xs font-semibold transition-colors"
                        >
                          <X size={12} />
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

      {detailsTutor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailsTutor(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {detailsTutor.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setDetailsTutor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {detailsTutor.employee_id && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-extrabold">
                  <BadgeCheck size={12} />
                  {detailsTutor.employee_id}
                </span>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                {detailsTutor.phone}
                {detailsTutor.whatsapp && (
                  <span className="text-gray-400">
                    (WhatsApp: {detailsTutor.whatsapp})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                {detailsTutor.email}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                {detailsTutor.city}
                {detailsTutor.state ? `, ${detailsTutor.state}` : ''}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen size={14} className="text-gray-400" />
                {detailsTutor.highest_qualification}
                {detailsTutor.institution
                  ? ` — ${detailsTutor.institution}`
                  : ''}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase size={14} className="text-gray-400" />
                {detailsTutor.years_experience || '—'} years experience
              </div>

              {detailsTutor.subjects?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Subjects
                  </p>
                  <p className="text-gray-600">
                    {detailsTutor.subjects.join(', ')}
                  </p>
                </div>
              )}

              {detailsTutor.exam_prep?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Exam Preparation
                  </p>
                  <p className="text-gray-600">
                    {detailsTutor.exam_prep.join(', ')}
                  </p>
                </div>
              )}

              {detailsTutor.introduction && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Introduction
                  </p>
                  <p className="text-gray-600">{detailsTutor.introduction}</p>
                </div>
              )}

              {detailsTutor.teaching_approach && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Teaching Approach
                  </p>
                  <p className="text-gray-600">
                    {detailsTutor.teaching_approach}
                  </p>
                </div>
              )}

              {detailsTutor.availability && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Availability
                  </p>
                  <p className="text-gray-600">{detailsTutor.availability}</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
                Registered{' '}
                {new Date(detailsTutor.created_at).toLocaleString()}
                {detailsTutor.reviewed_at && (
                  <>
                    {' '}
                    · Reviewed{' '}
                    {new Date(detailsTutor.reviewed_at).toLocaleString()}
                    {detailsTutor.reviewed_by_email
                      ? ` by ${detailsTutor.reviewed_by_email}`
                      : ''}
                  </>
                )}
              </div>

              {detailsTutor.employee_id && (
                <button
                  type="button"
                  onClick={() =>
                    downloadOnboardingLetter({
                      role: 'Tutor',
                      employeeId: detailsTutor.employee_id!,
                      fullName: detailsTutor.full_name,
                      city: detailsTutor.city,
                      contactValue: detailsTutor.phone,
                      contactLabel: 'Phone',
                      email: detailsTutor.email,
                      joinedOn: detailsTutor.created_at,
                      categoryLabel: 'Subjects',
                      categoryValue: detailsTutor.subjects?.join(', ') || '—',
                    })
                  }
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Download size={16} /> Download Onboarding Letter
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}