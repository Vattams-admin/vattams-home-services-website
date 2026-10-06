import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  Check,
  Loader,
  ArrowRight,
  ArrowLeft,
  X,
  AlertCircle,
  Upload,
  RefreshCw,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import PaymentModal from '@/components/PaymentModal';

import {
  STEPS,
  EMPTY_FORM,
  calculateProfileScore,
  submitTechnicianApplication,
  validateFile,
  uploadDocumentWithProgress,
  saveRegistrationDraft,
  loadRegistrationDraft,
  clearRegistrationDraft,
  type TechnicianFormData,
  type DocType,
} from '@/lib/technicianRegistration';

type UploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  fileName: string;
  error: string;
};

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  dl: 'Driving License',
  profile_photo: 'Profile Photo',
};

export default function TechnicianRegister() {
  const { navigate } = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<TechnicianFormData>(EMPTY_FORM);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [chatHistory, setChatHistory] = useState<
    { role: 'ai' | 'user'; text: string }[]
  >([]);

  const [uploadStates, setUploadStates] = useState<
    Record<string, UploadState>
  >({});

  const [hydrated, setHydrated] = useState(false);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [showJoinFeePayment, setShowJoinFeePayment] = useState(false);
  const [joinFeePaid, setJoinFeePaid] = useState(false);
  const [joinFeePaymentId, setJoinFeePaymentId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const currentStep = STEPS[stepIndex];

  const { score, missing } = calculateProfileScore(form);

  const progress = Math.min(
    100,
    Math.round((stepIndex / Math.max(STEPS.length - 1, 1)) * 100)
  );

  // Resume-in-progress registration (survives refresh / closed tab, same
  // device). Runs once on mount, before the default-first-question effect
  // below, so we don't flash the "Welcome" question if a draft exists.
  useEffect(() => {
    const draft = loadRegistrationDraft();

    if (draft && draft.stepIndex > 0 && draft.stepIndex < STEPS.length) {
      setForm((previous) => ({ ...previous, ...draft.form }));
      setStepIndex(draft.stepIndex);
      setChatHistory(
        Array.isArray(draft.chatHistory) ? draft.chatHistory : []
      );
      setResumedDraft(true);
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (stepIndex === 0 && chatHistory.length === 0) {
      setChatHistory([
        {
          role: 'ai',
          text: currentStep.question,
        },
      ]);
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [chatHistory, stepIndex, hydrated]);

  // Persist progress on every change so a refresh never loses the
  // technician's place. Profile score / completion is always recalculated
  // from the actual saved form fields, never from stepIndex alone.
  useEffect(() => {
    if (!hydrated || success) return;

    saveRegistrationDraft(stepIndex, form, chatHistory);
  }, [hydrated, success, stepIndex, form, chatHistory]);

  const advance = () => {
    setTimeout(() => {
      setStepIndex((current) => {
        const nextIndex = current + 1;

        if (nextIndex < STEPS.length) {
          setChatHistory((history) => [
            ...history,
            {
              role: 'ai',
              text: STEPS[nextIndex].question,
            },
          ]);

          return nextIndex;
        }

        return current;
      });
    }, 300);
  };

  const handleBoolean = (value: boolean) => {
    setError('');

    if (currentStep.field) {
      setForm((previous) => ({
        ...previous,
        [currentStep.field as keyof TechnicianFormData]: value,
      }));
    }

    setChatHistory((history) => [
      ...history,
      {
        role: 'user',
        text: value ? 'Yes' : 'No',
      },
    ]);

    setInputValue('');

    advance();
  };

  const handleNext = () => {
    setError('');

    const step = currentStep;

    if (step.type === 'review') {
      handleSubmit();
      return;
    }

    if (step.type === 'boolean') {
      handleBoolean(inputValue === 'yes');
      return;
    }

    if (step.type === 'upload') {
      // Completion is judged strictly from the saved form field (set only
      // after a real, successful upload) — never from merely reaching or
      // clicking through this step.
      if (step.validate) {
        const validationError = step.validate('', form);

        if (validationError) {
          setError(validationError);
          return;
        }
      }

      const uploaded = step.field
        ? !!form[step.field as keyof TechnicianFormData]
        : false;

      const label = DOC_LABELS[step.key] || 'Document';

      setChatHistory((history) => [
        ...history,
        {
          role: 'user',
          text: uploaded ? `${label} uploaded ✓` : 'Skipped',
        },
      ]);

      setInputValue('');

      advance();
      return;
    }

    if (step.type === 'multiselect') {
      if (step.validate) {
        const validationError = step.validate(inputValue, form);

        if (validationError) {
          setError(validationError);
          return;
        }
      }

      const selectedArr =
        (form[
          step.field as keyof TechnicianFormData
        ] as string[]) || [];

      setChatHistory((history) => [
        ...history,
        {
          role: 'user',
          text:
            selectedArr.length > 0
              ? selectedArr.join(', ')
              : 'None selected',
        },
      ]);

      setInputValue('');

      advance();
      return;
    }

    const value = inputValue.trim();

    if (step.optional && value.toLowerCase() === 'skip') {
      if (step.field) {
        setForm((previous) => ({
          ...previous,
          [step.field as keyof TechnicianFormData]: '',
        }));
      }

      setChatHistory((history) => [
        ...history,
        {
          role: 'user',
          text: 'Skipped',
        },
      ]);

      setInputValue('');

      advance();
      return;
    }

    if (step.validate) {
      const validationError = step.validate(value, form);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (step.field) {
      setForm((previous) => ({
        ...previous,
        [step.field as keyof TechnicianFormData]: value,
      }));
    }

    setChatHistory((history) => [
      ...history,
      {
        role: 'user',
        text: value,
      },
    ]);

    setInputValue('');

    advance();
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);

      setChatHistory((history) => {
        if (history.length >= 2) {
          return history.slice(0, -2);
        }

        return history;
      });

      setError('');
      setInputValue('');
    }
  };

  const toggleArrayItem = (
    field: keyof TechnicianFormData,
    item: string
  ) => {
    const currentArray =
      (form[field] as string[]) || [];

    const newArray = currentArray.includes(item)
      ? currentArray.filter((value) => value !== item)
      : [...currentArray, item];

    setForm((previous) => ({
      ...previous,
      [field]: newArray,
    }));
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    // Always reset the input value so selecting the exact same file again
    // (e.g. after an error) still fires onChange.
    event.target.value = '';

    if (!file) return;

    const step = currentStep;
    const key = step.key;
    const fieldName = step.field as keyof TechnicianFormData;

    // Guard against duplicate/overlapping uploads for this step.
    if (uploadStates[key]?.status === 'uploading') return;

    const clientError = validateFile(file);

    if (clientError) {
      setUploadStates((previous) => ({
        ...previous,
        [key]: {
          status: 'error',
          progress: 0,
          fileName: file.name,
          error: clientError,
        },
      }));
      return;
    }

    setUploadStates((previous) => ({
      ...previous,
      [key]: {
        status: 'uploading',
        progress: 0,
        fileName: file.name,
        error: '',
      },
    }));

    setError('');

    try {
      const result = await uploadDocumentWithProgress(
        file,
        form.mobile,
        key as DocType,
        (percent) => {
          setUploadStates((previous) => ({
            ...previous,
            [key]: {
              ...(previous[key] || {
                status: 'uploading',
                fileName: file.name,
                error: '',
              }),
              status: 'uploading',
              progress: percent,
            },
          }));
        }
      );

      setForm((previous) => ({
        ...previous,
        [fieldName]: result,
      }));

      setUploadStates((previous) => ({
        ...previous,
        [key]: {
          status: 'success',
          progress: 100,
          fileName: file.name,
          error: '',
        },
      }));
    } catch (err: any) {
      setUploadStates((previous) => ({
        ...previous,
        [key]: {
          status: 'error',
          progress: 0,
          fileName: file.name,
          error: err?.message || 'Upload failed. Please try again.',
        },
      }));
    }
  };

  const handleStartOver = () => {
    clearRegistrationDraft();
    setForm(EMPTY_FORM);
    setStepIndex(0);
    setChatHistory([]);
    setUploadStates({});
    setError('');
    setInputValue('');
    setResumedDraft(false);
  };

  const handleSkipUpload = () => {
    setError('');

    setChatHistory((history) => [
      ...history,
      {
        role: 'user',
        text: 'Skipped',
      },
    ]);

    advance();
  };

  const handleSubmit = async () => {
    if (!joinFeePaid) {
      setShowJoinFeePayment(true);
      return;
    }
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await submitTechnicianApplication(form, joinFeePaymentId || undefined);

      clearRegistrationDraft();
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration Error:', err);

      setError(
        err?.message ||
          JSON.stringify(err) ||
          'Registration failed.'
      );
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-[#f7f4ed] px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#e8e1d2] p-8 text-center">

          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle
              size={40}
              className="text-green-600"
            />
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            Registration Submitted Successfully!
          </h2>

          <p className="text-gray-500 mb-2">
            Your profile score:{' '}
            <span className="font-bold text-[#a47c00]">
              {score}%
            </span>
          </p>

          <p className="text-gray-500 mb-6 leading-7">
            Thank you for registering with{' '}
            <strong>VATTAMS HOME SERVICES</strong>.
            <br />
            <br />

            Your technician registration has been received
            successfully.

            <br />
            <br />

            Our Admin Team will review your profile and
            service details within <strong>24–48 hours</strong>.

            <br />
            <br />

            Once your application is approved, you will receive
            a confirmation through WhatsApp and Email.

            <br />
            <br />

            After approval, you can log in to your Technician
            Dashboard and start accepting service requests.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('home')}
              className="px-6 py-3 bg-[#0b1f3a] hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Home
            </button>

            <button
              onClick={() => navigate('technician-login')}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Technician Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24 min-h-screen bg-[#f7f4ed]">

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#071426] via-[#0b1f3a] to-[#071426] py-10 text-white">
        <div className="max-w-2xl mx-auto px-4 text-center">

          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Sparkles size={16} />
            AI Registration Assistant
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
            Join as a Technician
          </h1>

          <p className="text-white/90 text-sm">
            Answer a few questions — our AI guides you step by step
          </p>

        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {resumedDraft && (
          <div className="mb-4 flex items-center justify-between gap-3 bg-[#f8f4e8] border border-blue-100 text-[#0b1f3a] text-xs font-semibold rounded-xl px-4 py-2.5">
            <span>
              Welcome back — we picked up where you left off.
            </span>

            <button
              onClick={handleStartOver}
              className="flex items-center gap-1 text-[#0b1f3a] hover:text-blue-900 underline shrink-0"
            >
              <RotateCcw size={12} />
              Start Over
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">
              Step {stepIndex + 1} of {STEPS.length}
            </span>

            <span className="text-sm font-bold text-[#a47c00]">
              {progress}% Complete
            </span>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a227] rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Profile Score:
            </span>

            <span className="text-xs font-bold text-[#a47c00]">
              {score}%
            </span>

            {missing.length > 0 && (
              <span className="text-xs text-gray-400">
                • {missing.length} items pending
              </span>
            )}
          </div>

        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-[#e8e1d2] shadow-sm overflow-hidden">

          <div className="h-64 md:h-80 overflow-y-auto p-4 space-y-3 bg-[#f7f4ed]">

            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={
                  'flex ' +
                  (message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start')
                }
              >
                <div
                  className={
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ' +
                    (message.role === 'user'
                      ? 'bg-[#c9a227] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm')
                  }
                >
                  {message.text}
                </div>
              </div>
            ))}

            {submitting && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-2">

                  <Loader
                    size={14}
                    className="animate-spin text-[#b08b18]"
                  />

                  <span className="text-sm text-gray-500">
                    Submitting application...
                  </span>

                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* Input */}
          <div className="border-t border-[#e8e1d2] p-4">

            {error && (
              <div className="mb-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Text / Number / Password */}
            {(
              currentStep.type === 'text' ||
              currentStep.type === 'tel' ||
              currentStep.type === 'email' ||
              currentStep.type === 'number' ||
              currentStep.type === 'password'
            ) && (
              <div className="flex gap-2">

                <input
                  type={
                    currentStep.type === 'number'
                      ? 'number'
                      : currentStep.type === 'password'
                      ? 'password'
                      : currentStep.type === 'tel'
                      ? 'tel'
                      : 'text'
                  }
                  value={inputValue}
                  onChange={(event) =>
                    setInputValue(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleNext();
                    }
                  }}
                  placeholder={currentStep.placeholder}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                  autoFocus
                />

                <button
                  onClick={handleNext}
                  className="px-4 py-2.5 bg-[#c9a227] hover:bg-[#b08b18] text-white rounded-xl transition-colors"
                >
                  <Send size={18} />
                </button>

              </div>
            )}

            {/* Select */}
            {currentStep.type === 'select' && (
              <div className="space-y-2">

                <div className="flex flex-wrap gap-2">

                  {currentStep.options?.map((option) => {
                    const selected =
                      form[
                        currentStep.field as keyof TechnicianFormData
                      ] === option;

                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setInputValue(option);

                          if (currentStep.field) {
                            setForm((previous) => ({
                              ...previous,
                              [currentStep.field as keyof TechnicianFormData]:
                                option,
                            }));
                          }
                        }}
                        className={
                          'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
                          (selected
                            ? 'bg-[#c9a227] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        }
                      >
                        {option}
                      </button>
                    );
                  })}

                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-2.5 bg-[#c9a227] hover:bg-[#b08b18] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>

              </div>
            )}

            {/* Multi Select */}
            {currentStep.type === 'multiselect' && (
              <div className="space-y-2">

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">

                  {currentStep.options?.map((option) => {
                    const selectedArray =
                      (form[
                        currentStep.field as keyof TechnicianFormData
                      ] as string[]) || [];

                    const selected =
                      selectedArray.includes(option);

                    return (
                      <button
                        key={option}
                        onClick={() =>
                          toggleArrayItem(
                            currentStep.field as keyof TechnicianFormData,
                            option
                          )
                        }
                        className={
                          'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ' +
                          (selected
                            ? 'bg-[#c9a227] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        }
                      >
                        {selected && <Check size={14} className="inline-block mr-1 -mt-0.5" aria-hidden="true" />}
                        {option}
                      </button>
                    );
                  })}

                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-2.5 bg-[#c9a227] hover:bg-[#b08b18] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Confirm Selection
                  <ArrowRight size={16} />
                </button>

              </div>
            )}

            {/* Yes / No */}
            {currentStep.type === 'boolean' && (
              <div className="flex gap-2">

                <button
                  onClick={() => handleBoolean(true)}
                  className="flex-1 py-3 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={16} aria-hidden="true" /> Yes
                </button>

                <button
                  onClick={() => handleBoolean(false)}
                  className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
                >
                  <XCircle size={16} aria-hidden="true" /> No
                </button>

              </div>
            )}

            {/* File / Photo Upload */}
            {currentStep.type === 'upload' && (() => {
              const key = currentStep.key;
              const fieldName = currentStep.field as keyof TechnicianFormData;
              const savedValue = fieldName
                ? (form[fieldName] as string)
                : '';
              const state: UploadState = uploadStates[key] || {
                status: savedValue ? 'success' : 'idle',
                progress: savedValue ? 100 : 0,
                fileName: savedValue
                  ? savedValue.split('/').pop() || 'Uploaded file'
                  : '',
                error: '',
              };
              const label = DOC_LABELS[key] || 'Document';

              return (
                <div className="space-y-3">

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  {/* Idle — nothing uploaded yet */}
                  {state.status === 'idle' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-[#f8f4e8]/50 hover:bg-[#f8f4e8] text-[#a47c00] font-bold rounded-xl transition-colors text-sm"
                    >
                      <Upload size={18} />
                      Upload {label}
                    </button>
                  )}

                  {/* Uploading */}
                  {state.status === 'uploading' && (
                    <div className="bg-[#f7f4ed] border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader
                          size={16}
                          className="animate-spin text-[#b08b18]"
                        />
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          Uploading {state.fileName}...
                        </span>
                      </div>

                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c9a227] rounded-full transition-all duration-200"
                          style={{ width: `${state.progress}%` }}
                        />
                      </div>

                      <div className="text-xs text-gray-400 mt-1 text-right">
                        {state.progress}%
                      </div>
                    </div>
                  )}

                  {/* Success */}
                  {state.status === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                          <CheckCircle size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-green-700">
                            {label} uploaded ✓
                          </div>

                          <div className="text-xs text-green-600 truncate flex items-center gap-1">
                            <FileText size={11} />
                            {state.fileName}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#a47c00] hover:text-orange-700 bg-white border border-[#e0d0a8] rounded-lg px-3 py-1.5"
                      >
                        <RefreshCw size={12} />
                        Replace
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {state.status === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-600 text-sm font-semibold mb-2">
                        <AlertCircle size={15} />
                        Upload failed
                      </div>

                      <div className="text-xs text-red-500 mb-3">
                        {state.error}
                      </div>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2"
                      >
                        <RefreshCw size={12} />
                        Retry Upload
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Accepted: JPG, PNG, WebP, or PDF — up to 10MB.
                  </p>

                  <button
                    onClick={handleNext}
                    disabled={
                      state.status === 'uploading' ||
                      (!savedValue && !currentStep.optional)
                    }
                    className="w-full py-2.5 bg-[#c9a227] hover:bg-[#b08b18] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>

                  {currentStep.optional && !savedValue && (
                    <button
                      onClick={handleSkipUpload}
                      disabled={state.status === 'uploading'}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      Skip this step
                    </button>
                  )}

                </div>
              );
            })()}

            {/* Review */}
            {currentStep.type === 'review' && (
              <div className="space-y-3">

                <div className="bg-[#f7f4ed] rounded-xl p-4 max-h-64 overflow-y-auto space-y-1.5">

                  <div className="text-xs font-bold text-gray-500 mb-2">
                    Application Summary
                  </div>

                  {[
                    ['Name', form.full_name],
                    ['Mobile', form.mobile],
                    ['WhatsApp', form.whatsapp_number],
                    ['Email', form.email || '—'],
                    ['City', form.city],
                    ['Area', form.area],
                    ['PIN', form.pincode],
                    [
                      'Services',
                      form.service_categories.join(', '),
                    ],
                    [
                      'Experience',
                      form.experience_years + ' years',
                    ],
                    [
                      'Days',
                      form.available_days.join(', '),
                    ],
                    ['Working Time', form.working_time],
                    [
                      'Vehicle',
                      form.has_vehicle ? 'Yes' : 'No',
                    ],
                    [
                      'Tools',
                      form.has_tools ? 'Yes' : 'No',
                    ],
                    [
                      'Bank',
                      form.bank_name
                        ? `${form.bank_name} (${form.bank_ifsc})`
                        : 'Missing',
                    ],
                    ['UPI', form.upi_id || '—'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-gray-500">
                        {label}
                      </span>

                      <span className="font-semibold text-gray-800 text-right max-w-[60%]">
                        {value}
                      </span>
                    </div>
                  ))}

                </div>

                <div className="bg-[#f8f4e8] rounded-xl p-3 flex items-center justify-between">

                  <span className="text-sm font-bold text-orange-700">
                    Profile Score: {score}%
                  </span>

                  {missing.length > 0 && (
                    <span className="text-xs text-[#a47c00]">
                      {missing.length} items missing
                    </span>
                  )}

                </div>

                {missing.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">
                      Missing:
                    </span>{' '}
                    {missing.join(', ')}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <div className="font-bold">Technician Joining Fee: ₹49</div>
                  <div className="mt-1">One-time joining fee. Pay by UPI QR and submit your UTR for verification.</div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      {joinFeePaid ? 'Submit Application' : 'Pay ₹49 & Continue'}
                    </>
                  )}
                </button>

              </div>
            )}

            <PaymentModal
              open={showJoinFeePayment}
              onClose={() => setShowJoinFeePayment(false)}
              amount={49}
              purpose="registration_fee"
              payeeType="technician"
              payeeId={form.mobile || 'technician-registration'}
              payeeName={form.full_name}
              referenceId={form.mobile || undefined}
              note={`VATTAMS Technician Joining Fee - ${form.full_name || form.mobile}`}
              onSuccess={(paymentId) => {
                setJoinFeePaid(true);
                setJoinFeePaymentId(paymentId);
                setShowJoinFeePayment(false);
              }}
            />

            {/* Back */}
            {stepIndex > 0 &&
              currentStep.type !== 'review' && (
                <button
                  onClick={handleBack}
                  className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  Back
                </button>
              )}

          </div>
        </div>

        {/* Profile Score */}
        <div className="mt-4 bg-white rounded-xl border border-[#e8e1d2] shadow-sm p-4">

          <div className="flex items-center justify-between mb-2">

            <span className="text-sm font-bold text-gray-700">
              Profile Completeness
            </span>

            <span className="text-lg font-extrabold text-[#a47c00]">
              {score}%
            </span>

          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">

            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
              style={{
                width: `${score}%`,
              }}
            />

          </div>

          {missing.length > 0 && (
            <div className="space-y-1">

              {missing.slice(0, 5).map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 text-xs text-gray-400"
                >
                  <X size={10} />
                  {item}
                </div>
              ))}

              {missing.length > 5 && (
                <div className="text-xs text-gray-400">
                  +{missing.length - 5} more...
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}