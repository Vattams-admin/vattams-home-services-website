import { useState } from 'react';
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Monitor,
  Calendar,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { tuitionCourses, getTuitionCourseBySlug } from '@/pages/tuition/tuitionCoursesData';

interface TuitionBookingFormData {
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  city: string;
  courseSlug: string;
  preferredMode: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}

const PREFERRED_MODE_OPTIONS = [
  '1-on-1',
  'Small Group',
  'Either is fine',
];

const emptyFormData: TuitionBookingFormData = {
  studentName: '',
  parentName: '',
  phone: '',
  email: '',
  city: '',
  courseSlug: '',
  preferredMode: '',
  preferredDate: '',
  preferredTime: '',
  message: '',
};

export default function TuitionBooking() {
  const { navigate, tuitionCourseSlug } = useRouter();

  const resolvedCourse = getTuitionCourseBySlug(tuitionCourseSlug);

  const [formData, setFormData] = useState<TuitionBookingFormData>({
    ...emptyFormData,
    courseSlug: resolvedCourse ? resolvedCourse.slug : '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TuitionBookingFormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    field: keyof TuitionBookingFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof TuitionBookingFormData, string>> = {};

    if (!formData.studentName.trim()) {
      nextErrors.studentName = 'Student name is required.';
    }
    if (!formData.parentName.trim()) {
      nextErrors.parentName = 'Parent/Guardian name is required.';
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^[0-9+\-\s()]{7,}$/.test(formData.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number.';
    }
    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!formData.city.trim()) {
      nextErrors.city = 'City is required.';
    }
    if (!formData.courseSlug.trim()) {
      nextErrors.courseSlug = 'Please select a course.';
    }
    if (!formData.preferredMode.trim()) {
      nextErrors.preferredMode = 'Please select a preferred class mode.';
    }
    if (!formData.preferredDate.trim()) {
      nextErrors.preferredDate = 'Preferred date is required.';
    }
    if (!formData.preferredTime.trim()) {
      nextErrors.preferredTime = 'Preferred time is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // NOTE: This is a UI-only submission for now.
    // No Supabase, payment, WhatsApp, or Home Services booking integration
    // has been connected in this step, by design.
    setSubmitted(true);
  };

  const handleBookAnother = () => {
    setSubmitted(false);
    setFormData({
      ...emptyFormData,
      courseSlug: resolvedCourse ? resolvedCourse.slug : '',
    });
    setErrors({});
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
              <GraduationCap size={28} />
            </div>
            <p className="text-purple-200 text-sm font-semibold uppercase tracking-wide mb-2">
              Vattams Online Tuition
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Booking Request Received
            </h1>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 text-purple-600 mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Thank you, {formData.studentName || 'there'}!
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We've received your tuition booking request. Our team will reach
            out to {formData.parentName || 'you'} at{' '}
            <span className="font-medium text-gray-800">{formData.phone}</span>{' '}
            or{' '}
            <span className="font-medium text-gray-800">{formData.email}</span>{' '}
            shortly to confirm your session.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleBookAnother}
              className="px-5 py-2.5 rounded-xl border border-gray-200 hover:border-purple-300 text-gray-700 text-sm font-semibold transition-colors"
            >
              Book Another Session
            </button>
            <button
              type="button"
              onClick={() => navigate('tuition-courses')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Course Catalog
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <button
            type="button"
            onClick={() => navigate('tuition-courses')}
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Course Catalog
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
            <GraduationCap size={28} />
          </div>

          <p className="text-purple-200 text-sm font-semibold uppercase tracking-wide mb-2">
            Vattams Online Tuition
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Book a Tuition Session
          </h1>

          <p className="text-purple-100 text-base max-w-2xl">
            {resolvedCourse
              ? Fill in the details below to book a session for ${resolvedCourse.name}.
              : 'Fill in the details below and our team will get in touch to schedule your session.'}
          </p>
        </div>
      </section>

      {/* ================= FORM ================= */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* Student & Parent Details */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Student &amp; Parent Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <User size={15} className="text-purple-600" />
                  Student Name
                </label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => handleChange('studentName', e.target.value)}
                  placeholder="e.g. Aarav Menon"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.studentName
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.studentName && (
                  <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Users size={15} className="text-purple-600" />
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => handleChange('parentName', e.target.value)}
                  placeholder="e.g. Priya Menon"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.parentName
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.parentName && (
                  <p className="text-xs text-red-500 mt-1">{errors.parentName}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Phone size={15} className="text-purple-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.phone
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Mail size={15} className="text-purple-600" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="e.g. priya@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.email
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin size={15} className="text-purple-600" />
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Chennai"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.city
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.city && (
                  <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                )}
              </div>
            </div>
          </div>

          {/* Course & Schedule */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Course &amp; Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <BookOpen size={15} className="text-purple-600" />
                  Selected Course
                </label>

                {resolvedCourse ? (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-sm text-gray-800 font-medium">
                    {resolvedCourse.name}
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.courseSlug}
                      onChange={(e) => handleChange('courseSlug', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                        errors.courseSlug
                          ? 'border-red-400'
                          : 'border-gray-200 focus:border-purple-400'
                      }`}
                    >
                      <option value="">Select a course</option>
                      {tuitionCourses.map((course) => (
                        <option key={course.slug} value={course.slug}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                    {errors.courseSlug && (
                      <p className="text-xs text-red-500 mt-1">{errors.courseSlug}</p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Monitor size={15} className="text-purple-600" />
                  Preferred Class Mode
                </label>
                <select
                  value={formData.preferredMode}
                  onChange={(e) => handleChange('preferredMode', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.preferredMode
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                >
                  <option value="">Select a mode</option>
                  {PREFERRED_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                {errors.preferredMode && (
                  <p className="text-xs text-red-500 mt-1">{errors.preferredMode}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Calendar size={15} className="text-purple-600" />
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => handleChange('preferredDate', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.preferredDate
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.preferredDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.preferredDate}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Clock size={15} className="text-purple-600" />
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={formData.preferredTime}
                  onChange={(e) => handleChange('preferredTime', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors ${
                    errors.preferredTime
                      ? 'border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                />
                {errors.preferredTime && (
                  <p className="text-xs text-red-500 mt-1">{errors.preferredTime}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <MessageSquare size={15} className="text-purple-600" />
                  Additional Message{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  rows={4}
                  placeholder="Anything specific you'd like us to know?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            Book Tuition Session
          </button>
        </form>
      </section>
    </main>
  );
}
