import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Copy,
  Loader,
  Mic,
  Smartphone,
} from 'lucide-react';

import { useRouter } from '@/lib/router';
import { formatCurrency } from '@/lib/pricing';
import { DEFAULT_UPI_ID, PAYEE_NAME, buildUpiLink, generateUpiQrCode } from '@/lib/payments';
import {
  TRIAL_COURSES,
  TRIAL_FEE,
  TrialCourseSlug,
  TuitionCourseLevel,
  TuitionTrialRequest,
  fetchTrialCourseLevels,
  submitTrialRequest,
  submitTrialPaymentUtr,
} from '@/lib/tuitionTrial';

type Step = 'course' | 'level' | 'details' | 'pay' | 'success';

const COURSE_ICONS: Record<TrialCourseSlug, typeof Mic> = {
  'spoken-english': Mic,
  abacus: Calculator,
};

export default function TuitionTrialBooking() {
  const { navigate } = useRouter();

  const [step, setStep] = useState<Step>('course');

  const [courseSlug, setCourseSlug] = useState<TrialCourseSlug | null>(null);
  const [levels, setLevels] = useState<TuitionCourseLevel[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [levelsError, setLevelsError] = useState('');
  const [level, setLevel] = useState('');

  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [trialRequest, setTrialRequest] = useState<TuitionTrialRequest | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [upiLink, setUpiLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState('');

  const selectedCourse = TRIAL_COURSES.find((c) => c.slug === courseSlug) ?? null;

  const chooseCourse = async (slug: TrialCourseSlug) => {
    setCourseSlug(slug);
    setLevel('');
    setLevelsError('');
    setLevelsLoading(true);
    setStep('level');

    try {
      const rows = await fetchTrialCourseLevels(slug);
      setLevels(rows);
    } catch (error) {
      setLevelsError(
        error instanceof Error ? error.message : 'Could not load levels for this course.'
      );
    } finally {
      setLevelsLoading(false);
    }
  };

  const chooseLevel = (levelName: string) => {
    setLevel(levelName);
    setStep('details');
  };

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !courseSlug || !selectedCourse || !level) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const created = await submitTrialRequest({
        studentName,
        parentName,
        mobile,
        email,
        courseName: selectedCourse.name,
        courseSlug,
        level,
        preferredDate,
        preferredTime,
        notes,
      });

      setTrialRequest(created);
      setStep('pay');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Could not submit your trial booking. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'pay' || !trialRequest) return;

    const note = `Vattams Trial - ${trialRequest.course_name} - ${trialRequest.student_name}`;
    setUpiLink(buildUpiLink(TRIAL_FEE, note));
    generateUpiQrCode(TRIAL_FEE, note)
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [step, trialRequest]);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(DEFAULT_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUtrSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (utrSubmitting || !trialRequest || !utr.trim()) return;

    setUtrSubmitting(true);
    setUtrError('');

    try {
      const updated = await submitTrialPaymentUtr(trialRequest.id, utr);
      setTrialRequest(updated);
      setStep('success');
    } catch (error) {
      setUtrError(
        error instanceof Error
          ? error.message
          : 'Could not submit your payment reference. Please try again.'
      );
    } finally {
      setUtrSubmitting(false);
    }
  };

  const StepBack = ({ to, label }: { to: Step; label: string }) => (
    <button
      type="button"
      onClick={() => setStep(to)}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 mb-6"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">Book Trial — ₹150</h1>
          <p className="text-blue-100 max-w-xl mx-auto">
            One trial session, ₹150. Pick a course, a level, and we'll get you started.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-10">
        {/* ===================== STEP: COURSE ===================== */}
        {step === 'course' && (
          <div>
            <button
              type="button"
              onClick={() => navigate('tuition-home')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 mb-6"
            >
              <ArrowLeft size={16} />
              Back to Online Tuition
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select a course</h2>
            <p className="text-sm text-gray-500 mb-6">
              Trial sessions are currently available for these courses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TRIAL_COURSES.map((course) => {
                const Icon = COURSE_ICONS[course.slug];
                return (
                  <button
                    key={course.slug}
                    type="button"
                    onClick={() => chooseCourse(course.slug)}
                    className="flex items-center gap-4 p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all bg-white text-left"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                      <Icon size={24} />
                    </div>
                    <span className="font-semibold text-gray-900">{course.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== STEP: LEVEL ===================== */}
        {step === 'level' && selectedCourse && (
          <div>
            <StepBack to="course" label="Change course" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select a level</h2>
            <p className="text-sm text-gray-500 mb-6">{selectedCourse.name}</p>

            {levelsLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                <Loader size={16} className="animate-spin" />
                Loading levels…
              </div>
            )}

            {levelsError && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                {levelsError}
              </div>
            )}

            {!levelsLoading && !levelsError && (
              <div className="grid grid-cols-2 gap-3">
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => chooseLevel(lvl.level_name)}
                    className="px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm font-semibold text-gray-900 transition-all"
                  >
                    {lvl.level_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== STEP: DETAILS ===================== */}
        {step === 'details' && selectedCourse && (
          <div>
            <StepBack to="level" label="Change level" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Student &amp; parent details</h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedCourse.name} · {level}
            </p>

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Student Name
                </label>
                <input
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Parent / Guardian Name
                </label>
                <input
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader size={18} className="animate-spin" /> : null}
                Continue to Payment — {formatCurrency(TRIAL_FEE)}
              </button>
            </form>
          </div>
        )}

        {/* ===================== STEP: PAY ===================== */}
        {step === 'pay' && trialRequest && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pay for your trial session</h2>
            <p className="text-sm text-gray-500 mb-6">
              {trialRequest.course_name} · {trialRequest.level}
            </p>

            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Amount to Pay</span>
                <span className="text-2xl font-extrabold text-blue-900">
                  {formatCurrency(TRIAL_FEE)}
                </span>
              </div>

              <div className="p-6 flex flex-col items-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48 mb-4" />
                ) : (
                  <div className="w-48 h-48 mb-4 flex items-center justify-center text-gray-300">
                    <Loader size={24} className="animate-spin" />
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-2">
                  Scan with any UPI app, or pay to:
                </p>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 mb-3"
                >
                  {DEFAULT_UPI_ID}
                  <Copy size={14} />
                </button>
                {copied && <p className="text-xs text-green-600 mb-3">Copied!</p>}
                <p className="text-xs text-gray-400 mb-4">{PAYEE_NAME}</p>

                <a
                  href={upiLink}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  <Smartphone size={18} />
                  Open UPI App
                </a>
              </div>

              <div className="px-6 py-5 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Already paid? Enter your UPI reference (UTR) below.
                </p>
                <form onSubmit={handleUtrSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="UPI Transaction Reference (UTR)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={utrSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold disabled:opacity-50"
                  >
                    {utrSubmitting ? 'Submitting…' : "I've Paid"}
                  </button>
                </form>
                {utrError && <p className="text-sm text-red-600 mt-2">{utrError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ===================== STEP: SUCCESS ===================== */}
        {step === 'success' && trialRequest && (
          <div className="text-center py-10">
            <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Trial booking received!
            </h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              We've recorded your payment reference for the {trialRequest.course_name} trial
              ({trialRequest.level}). Our team will verify your payment and confirm your session
              shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate('tuition-home')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Back to Online Tuition
            </button>
          </div>
        )}
      </section>
    </main>
  );
}