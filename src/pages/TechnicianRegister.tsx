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
} from 'lucide-react';
import { useRouter } from '@/lib/router';

import {
  STEPS,
  EMPTY_FORM,
  calculateProfileScore,
  submitTechnicianApplication,
  type TechnicianFormData,
} from '@/lib/technicianRegistration';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[stepIndex];

  const { score, missing } = calculateProfileScore(form);

  const progress = Math.min(
    100,
    Math.round((stepIndex / Math.max(STEPS.length - 1, 1)) * 100)
  );

  useEffect(() => {
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
  }, [chatHistory, stepIndex]);

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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      await submitTechnicianApplication(form);

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration Error:', err);

      setError(
        err?.message ||
          JSON.stringify(err) ||
          'Registration failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="pt-20 md:pt-24 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">

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
            <span className="font-bold text-orange-600">
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
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
    <div className="pt-20 md:pt-24 min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 to-amber-600 py-10 text-white">
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

        {/* Progress */}
        <div className="mb-6">

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">
              Step {stepIndex + 1} of {STEPS.length}
            </span>

            <span className="text-sm font-bold text-orange-600">
              {progress}% Complete
            </span>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Profile Score:
            </span>

            <span className="text-xs font-bold text-orange-600">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="h-64 md:h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">

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
                      ? 'bg-orange-500 text-white rounded-br-sm'
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
                    className="animate-spin text-orange-500"
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
          <div className="border-t border-gray-100 p-4">

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
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
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
                            ? 'bg-orange-500 text-white'
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
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
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
                            ? 'bg-orange-500 text-white'
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
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
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

            {/* Review */}
            {currentStep.type === 'review' && (
              <div className="space-y-3">

                <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-1.5">

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

                <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between">

                  <span className="text-sm font-bold text-orange-700">
                    Profile Score: {score}%
                  </span>

                  {missing.length > 0 && (
                    <span className="text-xs text-orange-600">
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
                      Submit Application
                    </>
                  )}
                </button>

              </div>
            )}

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
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">

          <div className="flex items-center justify-between mb-2">

            <span className="text-sm font-bold text-gray-700">
              Profile Completeness
            </span>

            <span className="text-lg font-extrabold text-orange-600">
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