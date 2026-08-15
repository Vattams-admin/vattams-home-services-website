import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Check,
  Download,
  IndianRupee,
  Loader,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveTuitionTutor,
  fetchTuitionTutors,
  markTuitionTutorPaymentFailed,
  rejectTuitionTutor,
  TuitionTutorRow,
  TutorApprovalStatus,
  verifyTuitionTutorPayment,
} from '@/lib/tuitionTutors';
import { formatInr } from '@/lib/tuitionTutorFee';
import { downloadOnboardingLetter } from '@/lib/onboardingLetter';

type ViewFilter = 'ALL' | 'PAYMENT_PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

const FILTERS: { id: ViewFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
];

const APPROVAL_STYLES: Record<TutorApprovalStatus, string> = {
  REGISTERED: 'bg-gray-100 text-gray-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_VERIFIED: 'bg-sky-100 text-sky-700',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const APPROVAL_LABELS: Record<TutorApprovalStatus, string> = {
  REGISTERED: 'Registered',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_VERIFIED: 'Payment Verified',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-sky-50 text-sky-700 border-sky-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Payment Pending',
  submitted: 'Payment Submitted',
  verified: 'Payment Verified',
  failed: 'Payment Failed',
};

function ApprovalBadge({ status }: { status: TutorApprovalStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${APPROVAL_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {APPROVAL_LABELS[status] ?? status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${PAYMENT_STYLES[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
    >
      {PAYMENT_LABELS[status] ?? status}
    </span>
  );
}

function FeeSummary({ tutor }: { tutor: TuitionTutorRow }) {
  const hasDiscount = (tutor.discount_percentage ?? 0) > 0;
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5">
        {hasDiscount && (
          <span className="text-gray-400 line-through text-xs">
            {formatInr(tutor.registration_fee)}
          </span>
        )}
        <span className="font-bold text-gray-900">
          {formatInr(tutor.amount_paid)}
        </span>
        {hasDiscount && (
          <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">
            {tutor.discount_percentage}% OFF
          </span>
        )}
      </div>
      {hasDiscount && (
        <p className="text-[11px] text-green-600 font-medium mt-0.5">
          Save {formatInr(tutor.discount_amount)}
        </p>
      )}
    </div>
  );
}

export default function TuitionAdminTutors() {
  const [filter, setFilter] = useState<ViewFilter>('ALL');
  const [tutors, setTutors] = useState<TuitionTutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [detailsTutor, setDetailsTutor] = useState<TuitionTutorRow | null>(null);
  const [rejectingTutor, setRejectingTutor] = useState<TuitionTutorRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const loadTutors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTuitionTutors('all');
      setTutors(data);
    } catch (err) {
      console.error('[TuitionAdminTutors] load error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load tutor applications.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutors();
  }, []);

  const visibleTutors = useMemo(() => {
    if (filter === 'ALL') return tutors;
    if (filter === 'PAYMENT_PENDING') {
      return tutors.filter(
        (t) => t.approval_status === 'PAYMENT_PENDING' || t.approval_status === 'REGISTERED'
      );
    }
    return tutors.filter((t) => t.approval_status === filter);
  }, [tutors, filter]);

  const runAction = async (tutor: TuitionTutorRow, action: () => Promise<void>, errMsg: string) => {
    setActioningId(tutor.id);
    setError(null);
    try {
      await action();
      await loadTutors();
    } catch (err) {
      console.error('[TuitionAdminTutors] action error:', err);
      setError(err instanceof Error ? err.message : errMsg);
    } finally {
      setActioningId(null);
    }
  };

  const handleVerifyPayment = (tutor: TuitionTutorRow) =>
    runAction(tutor, () => verifyTuitionTutorPayment(tutor.id), 'Failed to verify payment.');

  const handlePaymentFailed = (tutor: TuitionTutorRow) =>
    runAction(tutor, () => markTuitionTutorPaymentFailed(tutor.id), 'Failed to update payment status.');

  const handleApprove = (tutor: TuitionTutorRow) =>
    runAction(tutor, () => approveTuitionTutor(tutor.id), 'Failed to approve tutor.');

  const openRejectModal = (tutor: TuitionTutorRow) => {
    setRejectingTutor(tutor);
    setRejectReason('');
    setRejectError(null);
  };

  const confirmReject = async () => {
    if (!rejectingTutor) return;
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for rejection.');
      return;
    }
    setActioningId(rejectingTutor.id);
    try {
      await rejectTuitionTutor(rejectingTutor.id, rejectReason);
      setRejectingTutor(null);
      await loadTutors();
    } catch (err) {
      console.error('[TuitionAdminTutors] reject error:', err);
      setRejectError(err instanceof Error ? err.message : 'Failed to reject tutor.');
    } finally {
      setActioningId(null);
    }
  };

  const renderActions = (tutor: TuitionTutorRow) => {
    const busy = actioningId === tutor.id;

    if (tutor.approval_status === 'APPROVED' || tutor.approval_status === 'REJECTED') {
      return <span className="text-xs text-gray-400">No actions</span>;
    }

    if (tutor.payment_status !== 'verified') {
      return (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleVerifyPayment(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 text-xs font-semibold transition-colors"
          >
            <ShieldCheck size={12} />
            Verify Payment
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handlePaymentFailed(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-xs font-semibold transition-colors"
          >
            <XCircle size={12} />
            Mark Failed
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleApprove(tutor)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 text-xs font-semibold transition-colors"
        >
          <Check size={12} />
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => openRejectModal(tutor)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-xs font-semibold transition-colors"
        >
          <X size={12} />
          Reject
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-200 w-fit overflow-x-auto max-w-full">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
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
          onClick={() => loadTutors()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader size={18} className="animate-spin" />
          Loading tutor applications...
        </div>
      ) : visibleTutors.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <UserCheck size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tutor applications in this view yet.</p>
        </div>
      ) : (
        <>
          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Tutor</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Qualification</th>
                  <th className="px-4 py-3 font-semibold">Subjects</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold">Amount Payable</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Approval</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleTutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-gray-50/60 align-top">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailsTutor(tutor)}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                      >
                        {tutor.full_name}
                      </button>
                      {tutor.employee_id && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 mt-0.5">
                          <BadgeCheck size={11} />
                          {tutor.employee_id}
                        </div>
                      )}
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
                      {tutor.highest_qualification}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tutor.subjects?.length ? tutor.subjects.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(tutor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <FeeSummary tutor={tutor} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={tutor.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalBadge status={tutor.approval_status} />
                    </td>
                    <td className="px-4 py-3">{renderActions(tutor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-4">
            {visibleTutors.map((tutor) => (
              <div
                key={tutor.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailsTutor(tutor)}
                      className="font-bold text-gray-900 text-left"
                    >
                      {tutor.full_name}
                    </button>
                    {tutor.employee_id && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 mt-0.5">
                        <BadgeCheck size={11} />
                        {tutor.employee_id}
                      </div>
                    )}
                  </div>
                  <ApprovalBadge status={tutor.approval_status} />
                </div>

                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400" />
                    {tutor.phone}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400" />
                    {tutor.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-gray-400" />
                    {tutor.highest_qualification}
                  </div>
                  {tutor.subjects?.length > 0 && (
                    <p className="text-gray-500">Subjects: {tutor.subjects.join(', ')}</p>
                  )}
                  <p className="text-gray-400">
                    Registered {new Date(tutor.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 mb-3">
                  <FeeSummary tutor={tutor} />
                  <PaymentBadge status={tutor.payment_status} />
                </div>

                <div className="flex justify-end">{renderActions(tutor)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== DETAILS MODAL ===== */}
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
              <h3 className="text-lg font-bold text-gray-900">{detailsTutor.full_name}</h3>
              <button
                type="button"
                onClick={() => setDetailsTutor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-4">
              {detailsTutor.employee_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-extrabold">
                  <BadgeCheck size={12} />
                  {detailsTutor.employee_id}
                </span>
              )}
              <ApprovalBadge status={detailsTutor.approval_status} />
              <PaymentBadge status={detailsTutor.payment_status} />
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                <IndianRupee size={12} />
                Registration Fee
              </div>
              <FeeSummary tutor={detailsTutor} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                {detailsTutor.phone}
                {detailsTutor.whatsapp && (
                  <span className="text-gray-400">(WhatsApp: {detailsTutor.whatsapp})</span>
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
                {detailsTutor.institution ? ` — ${detailsTutor.institution}` : ''}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase size={14} className="text-gray-400" />
                {detailsTutor.years_experience || '—'} years experience
              </div>

              {detailsTutor.subjects?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Subjects</p>
                  <p className="text-gray-600">{detailsTutor.subjects.join(', ')}</p>
                </div>
              )}

              {detailsTutor.exam_prep?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Exam Preparation</p>
                  <p className="text-gray-600">{detailsTutor.exam_prep.join(', ')}</p>
                </div>
              )}

              {detailsTutor.introduction && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Introduction</p>
                  <p className="text-gray-600">{detailsTutor.introduction}</p>
                </div>
              )}

              {detailsTutor.teaching_approach && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Teaching Approach</p>
                  <p className="text-gray-600">{detailsTutor.teaching_approach}</p>
                </div>
              )}

              {detailsTutor.availability && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Availability</p>
                  <p className="text-gray-600">{detailsTutor.availability}</p>
                </div>
              )}

              {detailsTutor.approval_status === 'REJECTED' && detailsTutor.rejection_reason && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                  <p className="font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-red-700">{detailsTutor.rejection_reason}</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
                Registered {new Date(detailsTutor.created_at).toLocaleString()}
                {detailsTutor.approved_at && (
                  <>
                    {' '}
                    · Approved {new Date(detailsTutor.approved_at).toLocaleString()}
                    {detailsTutor.approved_by ? ` by ${detailsTutor.approved_by}` : ''}
                  </>
                )}
                {detailsTutor.rejected_at && (
                  <>
                    {' '}
                    · Rejected {new Date(detailsTutor.rejected_at).toLocaleString()}
                    {detailsTutor.rejected_by ? ` by ${detailsTutor.rejected_by}` : ''}
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

      {/* ===== REJECT REASON MODAL ===== */}
      {rejectingTutor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => (actioningId ? null : setRejectingTutor(null))}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Reject {rejectingTutor.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingTutor(null)}
                className="text-gray-400 hover:text-gray-600"
                disabled={actioningId === rejectingTutor.id}
              >
                <X size={20} />
              </button>
            </div>

            <label
              htmlFor="reject-reason"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Reason for rejection *
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              rows={4}
              placeholder="e.g. Qualification documents did not match, unreachable for verification call, etc."
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-colors ${
                rejectError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {rejectError && (
              <p className="text-xs text-red-600 mt-1.5">{rejectError}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRejectingTutor(null)}
                disabled={actioningId === rejectingTutor.id}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={actioningId === rejectingTutor.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {actioningId === rejectingTutor.id ? (
                  <Loader size={15} className="animate-spin" />
                ) : (
                  <X size={15} />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}