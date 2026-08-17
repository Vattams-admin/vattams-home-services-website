import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  AlertTriangle,
  User,
  UserSquare2,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { submitTutorApplication } from '@/lib/tuitionTutors';

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Science',
  'English',
  'Tamil',
  'Hindi',
  'Social Science',
  'Computer Science',
  'Coding',
  'Public Speaking',
  'Abacus',
  'Exam Preparation',
  'Other',
];

const EXAM_PREP_OPTIONS = [
  'School Syllabus',
  'CBSE',
  'ICSE',
  'State Board',
  'Competitive Exams',
  'Other',
];

const TEACHING_MODE_OPTIONS = [
  'Online One-to-One',
  'Online Group',
  'Both',
];

type TutorFormData = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;

  highestQualification: string;
  institution: string;
  yearsExperience: string;
  classesCanTeach: string;
  teachingLanguages: string;
  teachingMode: string;

  subjects: string[];
  examPrep: string[];

  introduction: string;
  teachingApproach: string;
  availability: string;

  consent: boolean;
};

const initialForm: TutorFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  whatsapp: '',
  email: '',
  city: '',
  state: '',

  highestQualification: '',
  institution: '',
  yearsExperience: '',
  classesCanTeach: '',
  teachingLanguages: '',
  teachingMode: 'Online One-to-One',

  subjects: [],
  examPrep: [],

  introduction: '',
  teachingApproach: '',
  availability: '',

  consent: false,
};

type FormErrors = Partial<Record<keyof TutorFormData, string>>;

export default function TuitionTutorRegister() {
  const { navigate } = useRouter();

  const [form, setForm] = useState<TutorFormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof TutorFormData>(
    field: K,
    value: TutorFormData[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const toggleListValue = (
    field: 'subjects' | 'examPrep',
    value: string
  ) => {
    setForm((current) => {
      const list = current[field];
      const nextList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

      return {
        ...current,
        [field]: nextList,
      };
    });

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.city.trim()) {
      nextErrors.city = 'City is required.';
    }

    if (!form.highestQualification.trim()) {
      nextErrors.highestQualification =
        'Highest qualification is required.';
    }

    if (form.subjects.length === 0) {
      nextErrors.subjects = 'Select at least one subject.';
    }

    if (!form.consent) {
      nextErrors.consent =
        'Please confirm the declaration before submitting.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorField = Object.keys(nextErrors)[0];
      const el = document.getElementById(firstErrorField);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Real Supabase INSERT into public.tuition_tutors — awaited, so we
      // only show success once the row is actually confirmed written.
      await submitTutorApplication({
        full_name: form.fullName,
        date_of_birth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email,
        city: form.city,
        state: form.state || undefined,

        highest_qualification: form.highestQualification,
        institution: form.institution || undefined,
        years_experience: form.yearsExperience || undefined,
        classes_can_teach: form.classesCanTeach || undefined,
        teaching_languages: form.teachingLanguages || undefined,
        teaching_mode: form.teachingMode || undefined,

        subjects: form.subjects,
        exam_prep: form.examPrep,

        introduction: form.introduction || undefined,
        teaching_approach: form.teachingApproach || undefined,
        availability: form.availability || undefined,
      });

      console.log('[TuitionTutorRegister] Application inserted into tuition_tutors successfully.');

      // Only reached if the INSERT actually succeeded.
      setSubmitted(true);
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err) {
      console.error('[TuitionTutorRegister] Tutor application submission failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'We could not submit your application. Please check your connection and try again.';
      setSubmitError(message);
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    'w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 transition-colors';
  const plainInputClasses =
    'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 transition-colors';

  const borderClasses = (hasError?: string) =>
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-100';

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white text-gray-900">
        <section className="max-w-3xl mx-auto px-6 py-20">
          <div className="bg-white border border-purple-100 rounded-3xl shadow-sm p-8 md:p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={34} className="text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully
            </h1>

            <p className="text-gray-600 leading-relaxed max-w-xl mx-auto mb-4">
              Our team will review your application and contact
              you.
            </p>

            <p className="text-gray-500 text-sm leading-relaxed max-w-xl mx-auto mb-2">
              This submission does not create a tutor account, and
              no verification has taken place yet.
            </p>

            <p className="inline-flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              Payment status: Pending
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate('tuition-home')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
              >
                <ArrowLeft size={17} />
                Back to Online Tuition
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setErrors({});
                  setSubmitError(null);
                  setSubmitted(false);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-colors"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* HERO */}
      <section className="bg-gradient-to-r from-slate-950 via-purple-950 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-16">
          <button
            type="button"
            onClick={() => navigate('tuition-home')}
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white text-sm font-medium mb-7 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Online Tuition
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
            <GraduationCap size={29} />
          </div>

          <p className="text-purple-300 text-sm font-semibold uppercase tracking-wider mb-2">
            Vattams Online Tuition
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Tutor Registration
          </h1>

          <p className="text-purple-100 text-base max-w-2xl">
            Join our team of online tutors. Fill in your details
            below and our team will review your application.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="max-w-5xl mx-auto px-6 py-12 md:py-14">
        {submitError && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Application not submitted</p>
              <p className="text-sm text-red-700 mt-1">{submitError}</p>
              <p className="text-sm text-red-700 mt-1">
                Your entered details have been kept — please try submitting again.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL INFORMATION */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <User size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Personal Information
                  </h2>
                  <p className="text-sm text-gray-500">
                    Basic details about you.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Full Name *
                  </label>
                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={(e) =>
                        updateField('fullName', e.target.value)
                      }
                      placeholder="Enter your full name"
                      className={`${inputClasses} ${borderClasses(errors.fullName)}`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1.5">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Date of Birth
                  </label>
                  <div className="relative">
                    <CalendarDays
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        updateField('dateOfBirth', e.target.value)
                      }
                      className={`${inputClasses} ${borderClasses()}`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={(e) =>
                      updateField('gender', e.target.value)
                    }
                    className={`${plainInputClasses} ${borderClasses()}`}
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">
                      Prefer not to say
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        updateField('phone', e.target.value)
                      }
                      placeholder="10-digit mobile number"
                      className={`${inputClasses} ${borderClasses(errors.phone)}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1.5">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="whatsapp"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="whatsapp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) =>
                        updateField('whatsapp', e.target.value)
                      }
                      placeholder="If different from phone number"
                      className={`${inputClasses} ${borderClasses()}`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email *
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        updateField('email', e.target.value)
                      }
                      placeholder="you@example.com"
                      className={`${inputClasses} ${borderClasses(errors.email)}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1.5">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    City *
                  </label>
                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) =>
                        updateField('city', e.target.value)
                      }
                      placeholder="Enter your city"
                      className={`${inputClasses} ${borderClasses(errors.city)}`}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-xs text-red-600 mt-1.5">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    State
                  </label>
                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />
                    <input
                      id="state"
                      type="text"
                      value={form.state}
                      onChange={(e) =>
                        updateField('state', e.target.value)
                      }
                      placeholder="Enter your state"
                      className={`${inputClasses} ${borderClasses()}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PROFESSIONAL INFORMATION */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <GraduationCap size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Professional Information
                  </h2>
                  <p className="text-sm text-gray-500">
                    Your teaching background and qualifications.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="highestQualification"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Highest Qualification *
                  </label>
                  <input
                    id="highestQualification"
                    type="text"
                    value={form.highestQualification}
                    onChange={(e) =>
                      updateField(
                        'highestQualification',
                        e.target.value
                      )
                    }
                    placeholder="e.g. M.Sc Mathematics, B.Ed"
                    className={`${plainInputClasses} ${borderClasses(errors.highestQualification)}`}
                  />
                  {errors.highestQualification && (
                    <p className="text-xs text-red-600 mt-1.5">
                      {errors.highestQualification}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="institution"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    University / Institution
                  </label>
                  <input
                    id="institution"
                    type="text"
                    value={form.institution}
                    onChange={(e) =>
                      updateField('institution', e.target.value)
                    }
                    placeholder="Enter institution name"
                    className={`${plainInputClasses} ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="yearsExperience"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Years of Teaching Experience
                  </label>
                  <input
                    id="yearsExperience"
                    type="number"
                    min={0}
                    max={60}
                    value={form.yearsExperience}
                    onChange={(e) =>
                      updateField('yearsExperience', e.target.value)
                    }
                    placeholder="e.g. 5"
                    className={`${plainInputClasses} ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="classesCanTeach"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Classes / Grades Can Teach
                  </label>
                  <input
                    id="classesCanTeach"
                    type="text"
                    value={form.classesCanTeach}
                    onChange={(e) =>
                      updateField('classesCanTeach', e.target.value)
                    }
                    placeholder="e.g. Grades 6 to 12"
                    className={`${plainInputClasses} ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="teachingLanguages"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Teaching Languages
                  </label>
                  <input
                    id="teachingLanguages"
                    type="text"
                    value={form.teachingLanguages}
                    onChange={(e) =>
                      updateField(
                        'teachingLanguages',
                        e.target.value
                      )
                    }
                    placeholder="e.g. English, Tamil"
                    className={`${plainInputClasses} ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="teachingMode"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Preferred Teaching Mode
                  </label>
                  <select
                    id="teachingMode"
                    value={form.teachingMode}
                    onChange={(e) =>
                      updateField('teachingMode', e.target.value)
                    }
                    className={`${plainInputClasses} ${borderClasses()}`}
                  >
                    {TEACHING_MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TUITION SPECIALIZATION */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <BookOpen size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Tuition Specialization
                  </h2>
                  <p className="text-sm text-gray-500">
                    Select all subjects you can teach. *
                  </p>
                </div>
              </div>

              <div
                id="subjects"
                className="flex flex-wrap gap-2.5"
              >
                {SUBJECT_OPTIONS.map((subject) => {
                  const isSelected = form.subjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() =>
                        toggleListValue('subjects', subject)
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
              {errors.subjects && (
                <p className="text-xs text-red-600 mt-3">
                  {errors.subjects}
                </p>
              )}
            </div>

            {/* EXAM / COMPETITIVE PREPARATION */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <BadgeCheck size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Exam / Competitive Preparation
                  </h2>
                  <p className="text-sm text-gray-500">
                    Optional — select any that apply.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {EXAM_PREP_OPTIONS.map((option) => {
                  const isSelected = form.examPrep.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        toggleListValue('examPrep', option)
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PROFILE */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <UserSquare2 size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Profile
                  </h2>
                  <p className="text-sm text-gray-500">
                    Tell students and parents about yourself.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="introduction"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Short Professional Introduction
                  </label>
                  <textarea
                    id="introduction"
                    rows={3}
                    value={form.introduction}
                    onChange={(e) =>
                      updateField('introduction', e.target.value)
                    }
                    placeholder="Briefly introduce your teaching background..."
                    className={`${plainInputClasses} resize-none ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="teachingApproach"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Teaching Approach
                  </label>
                  <textarea
                    id="teachingApproach"
                    rows={3}
                    value={form.teachingApproach}
                    onChange={(e) =>
                      updateField('teachingApproach', e.target.value)
                    }
                    placeholder="Describe how you approach teaching..."
                    className={`${plainInputClasses} resize-none ${borderClasses()}`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="availability"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Availability
                  </label>
                  <textarea
                    id="availability"
                    rows={2}
                    value={form.availability}
                    onChange={(e) =>
                      updateField('availability', e.target.value)
                    }
                    placeholder="e.g. Weekday evenings, weekends"
                    className={`${plainInputClasses} resize-none ${borderClasses()}`}
                  />
                </div>
              </div>
            </div>

            {/* DOCUMENTS */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <FileText size={19} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Qualification & Verification Documents
                  </h2>
                  <p className="text-sm text-gray-500">
                    Document uploads are coming soon.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-5 flex items-start gap-3">
                <ShieldCheck
                  size={18}
                  className="text-amber-600 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-amber-800 leading-relaxed">
                  Document upload will be enabled once our secure
                  verification system for tutors is ready. For now,
                  please continue with the rest of your application
                  — our team will contact you separately for
                  document verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: 'Qualification Certificate',
                    icon: GraduationCap,
                  },
                  {
                    label: 'Experience Certificate',
                    icon: FileText,
                  },
                  {
                    label: 'Identity Proof',
                    icon: CreditCard,
                  },
                  {
                    label: 'Profile Photo',
                    icon: UserSquare2,
                  },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 flex items-center gap-3 opacity-70 cursor-not-allowed"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        {label}
                      </p>
                      <p className="text-xs text-gray-400">
                        Coming soon
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONSENT */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <label
                htmlFor="consent"
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  id="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) =>
                    updateField('consent', e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I confirm that the information provided is
                  accurate and I agree to VATTAMS Online Tuition
                  reviewing my tutor application.
                </span>
              </label>
              {errors.consent && (
                <p className="text-xs text-red-600 mt-2 ml-7">
                  {errors.consent}
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <GraduationCap size={18} />
                    Submit Tutor Application
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Submitting this form does not create a tutor account.
                Our team will review your application and reach out
                to you.
              </p>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside>
            <div className="lg:sticky lg:top-24 space-y-5">
              <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                      Become a Tutor
                    </p>
                    <h3 className="font-bold text-purple-950">
                      Teach with Vattams
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-purple-900/70 leading-relaxed">
                  Share your expertise with students across India
                  through live, personalised online tuition.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  What Happens Next
                </h3>
                <ul className="space-y-3">
                  {[
                    'Our team reviews your application',
                    'We may reach out for a short interview',
                    'Document verification (coming soon)',
                    'Onboarding as a Vattams tutor',
                  ].map((item, index) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-gray-600"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => navigate('tuition-home')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Online Tuition
              </button>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}