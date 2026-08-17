import { useEffect, useState, useCallback } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  BookOpen,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FlaskConical,
  Receipt,
} from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';
import {
  TuitionTrialRequest,
  TrialPaymentStatus,
  adminListTrialRequests,
  adminUpdateTrialStatus,
} from '@/lib/tuitionTrial';

type StatusFilter = 'pending' | 'verified' | 'confirmed' | 'all';

function getAdminId(): string | null {
  // Matches the session format set by src/pages/AdminLogin.tsx —
  // sessionStorage.setItem('vattams_admin', adminRow.id).
  return sessionStorage.getItem('vattams_admin');
}

function PaymentBadge({ status }: { status: TrialPaymentStatus }) {
  const styles: Record<TrialPaymentStatus, string> = {
    PAYMENT_PENDING: 'bg-gray-50 text-gray-600 border-gray-200',
    PAYMENT_PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
    PAYMENT_VERIFIED: 'bg-green-50 text-green-700 border-green-200',
    PAYMENT_FAILED: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels: Record<TrialPaymentStatus, string> = {
    PAYMENT_PENDING: 'Payment Pending',
    PAYMENT_PROCESSING: 'Awaiting Verification',
    PAYMENT_VERIFIED: 'Payment Verified',
    PAYMENT_FAILED: 'Payment Failed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function TuitionAdminTrials() {
  const [trials, setTrials] = useState<TuitionTrialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [selected, setSelected] = useState<TuitionTrialRequest | null>(null);
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadTrials = useCallback(async () => {
    const adminId = getAdminId();

    if (!adminId) {
      setError('Your admin session could not be verified. Please log in again.');
      setLoading(false);
      return;
    }

    setError('');

    try {
      const rows = await adminListTrialRequests(adminId);
      setTrials(rows);
    } catch (err) {
      console.error('[TuitionAdminTrials] loadTrials error:', err);
      setError('Could not load trial requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrials();

    const pollInterval = window.setInterval(() => {
      loadTrials();
    }, 20000);

    return () => window.clearInterval(pollInterval);
  }, [loadTrials]);

  const verifyPayment = async (id: string) => {
    const adminId = getAdminId();
    if (!adminId) {
      setActionError('Your admin session could not be verified. Please log in again.');
      return;
    }

    setUpdatingId(id);
    setActionError('');

    try {
      const updated = await adminUpdateTrialStatus(adminId, id, 'PAYMENT_VERIFIED', 'CONFIRMED');
      setTrials((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      console.error('[TuitionAdminTrials] verifyPayment error:', err);
      setActionError('Could not verify this payment. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectPayment = async (id: string) => {
    const adminId = getAdminId();
    if (!adminId) {
      setActionError('Your admin session could not be verified. Please log in again.');
      return;
    }

    setUpdatingId(id);
    setActionError('');

    try {
      const updated = await adminUpdateTrialStatus(adminId, id, 'PAYMENT_FAILED', 'CANCELLED');
      setTrials((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      console.error('[TuitionAdminTrials] rejectPayment error:', err);
      setActionError('Could not update this request. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    pending: trials.filter(
      (t) => t.payment_status === 'PAYMENT_PENDING' || t.payment_status === 'PAYMENT_PROCESSING'
    ).length,
    verified: trials.filter((t) => t.payment_status === 'PAYMENT_VERIFIED').length,
    confirmed: trials.filter((t) => t.booking_status === 'CONFIRMED').length,
    all: trials.length,
  };

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'pending', label: 'Awaiting Review', count: counts.pending },
    { id: 'verified', label: 'Verified', count: counts.verified },
    { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
    { id: 'all', label: 'All', count: counts.all },
  ];

  const filtered = trials.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'pending')
      return t.payment_status === 'PAYMENT_PENDING' || t.payment_status === 'PAYMENT_PROCESSING';
    if (filter === 'verified') return t.payment_status === 'PAYMENT_VERIFIED';
    if (filter === 'confirmed') return t.booking_status === 'CONFIRMED';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading trial requests…
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
            loadTrials();
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
          <FlaskConical className="mx-auto mb-3 text-gray-300" size={28} />
          <p className="text-sm text-gray-500">No trial requests in this view yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Mobile</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.student_name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.course_name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.level}</td>
                  <td className="px-4 py-3 text-gray-600">{t.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(t.fee_amount)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={t.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(t)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100"
                      >
                        View
                      </button>
                      {t.payment_status !== 'PAYMENT_VERIFIED' && (
                        <button
                          type="button"
                          disabled={updatingId === t.id || t.payment_status === 'PAYMENT_PENDING'}
                          onClick={() => verifyPayment(t.id)}
                          title={
                            t.payment_status === 'PAYMENT_PENDING'
                              ? 'Waiting for the student to submit a UTR'
                              : undefined
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          Verify
                        </button>
                      )}
                      {t.booking_status !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={updatingId === t.id}
                          onClick={() => rejectPayment(t.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          Cancel
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
                <FlaskConical size={18} className="text-purple-600" />
                <h2 className="font-bold text-gray-900">Trial Booking</h2>
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
                  <PaymentBadge status={selected.payment_status} />
                </div>
                <p className="text-sm text-gray-500">
                  {selected.course_name} · {selected.level}
                </p>
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
                    <p className="font-medium text-gray-900">{selected.mobile}</p>
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
                  <BookOpen size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Course / Level</p>
                    <p className="font-medium text-gray-900">
                      {selected.course_name} — {selected.level}
                    </p>
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
                <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
                  <Receipt size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">UTR</p>
                    <p className="font-medium text-gray-900 break-all">{selected.utr || '—'}</p>
                  </div>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Additional Message</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {selected.payment_status !== 'PAYMENT_VERIFIED' && (
                  <button
                    type="button"
                    disabled={updatingId === selected.id || selected.payment_status === 'PAYMENT_PENDING'}
                    onClick={() => verifyPayment(selected.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} />
                    Verify &amp; Confirm
                  </button>
                )}
                {selected.booking_status !== 'CANCELLED' && (
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => rejectPayment(selected.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}