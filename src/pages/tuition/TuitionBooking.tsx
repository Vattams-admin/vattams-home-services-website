import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { getTuitionCourseBySlug } from './tuitionCoursesData';

type FormData = {
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  city: string;
  course: string;
  mode: string;
  date: string;
  time: string;
  message: string;
};

const initialForm: FormData = {
  studentName: '',
  parentName: '',
  phone: '',
  email: '',
  city: '',
  course: '',
  mode: 'Online One-to-One',
  date: '',
  time: '',
  message: '',
};

export default function TuitionBooking() {
  const { tuitionCourseSlug, navigate } = useRouter();

  const resolvedCourse = tuitionCourseSlug
    ? getTuitionCourseBySlug(tuitionCourseSlug)
    : null;

  const [form, setForm] = useState<FormData>({
    ...initialForm,
    course: resolvedCourse?.name ?? '',
  });

  const [submitted, setSubmitted] = useState(false);

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitted(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white text-gray-900">
        <section className="max-w-3xl mx-auto px-6 py-20">
          <div className="bg-white border border-purple-100 rounded-3xl shadow-sm p-8 md:p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2
                size={34}
                className="text-green-600"
              />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Tuition Request Submitted
            </h1>

            <p className="text-gray-600 leading-relaxed max-w-xl mx-auto mb-8">
              Thank you for your interest in Vattams Online Tuition.
              Our team will review your request and contact you to
              confirm the class schedule.
            </p>

            {resolvedCourse && (
              <div className="rounded-2xl bg-purple-50 border border-purple-100 p-5 mb-8">
                <p className="text-sm text-purple-700 mb-1">
                  Selected Course
                </p>

                <p className="text-lg font-bold text-purple-900">
                  {resolvedCourse.name}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate('tuition-courses')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
              >
                <ArrowLeft size={17} />
                Back to Courses
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm({
                    ...initialForm,
                    course: resolvedCourse?.name ?? '',
                  });
                  setSubmitted(false);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition-colors"
              >
                Submit Another Request
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
            onClick={() => navigate('tuition-courses')}
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white text-sm font-medium mb-7 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Course Catalog
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
            <GraduationCap size={29} />
          </div>

          <p className="text-purple-300 text-sm font-semibold uppercase tracking-wider mb-2">
            Vattams Online Tuition
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Book an Online Tuition Session
          </h1>

          <p className="text-purple-100 text-base max-w-2xl">
            {resolvedCourse
              ? `Fill in the details below to book a session for ${resolvedCourse.name}.`
              : 'Fill in the details below and our team will get in touch to schedule your session.'}
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="max-w-5xl mx-auto px-6 py-12 md:py-14">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* MAIN FORM */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">
                  Student & Parent Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Please provide accurate contact details so our team
                  can reach you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Student Name */}
                <div>
                  <label
                    htmlFor="studentName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Student Name *
                  </label>

                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />

                    <input
                      id="studentName"
                      type="text"
                      required
                      value={form.studentName}
                      onChange={(e) =>
                        updateField(
                          'studentName',
                          e.target.value
                        )
                      }
                      placeholder="Enter student name"
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* Parent Name */}
                <div>
                  <label
                    htmlFor="parentName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Parent / Guardian Name *
                  </label>

                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />

                    <input
                      id="parentName"
                      type="text"
                      required
                      value={form.parentName}
                      onChange={(e) =>
                        updateField(
                          'parentName',
                          e.target.value
                        )
                      }
                      placeholder="Enter parent or guardian name"
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* Phone */}
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
                      required
                      value={form.phone}
                      onChange={(e) =>
                        updateField(
                          'phone',
                          e.target.value
                        )
                      }
                      placeholder="Enter phone number"
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>

                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400"
                    />

                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        updateField(
                          'email',
                          e.target.value
                        )
                      }
                      placeholder="Enter email address"
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* City */}
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
                      required
                      value={form.city}
                      onChange={(e) =>
                        updateField(
                          'city',
                          e.target.value
                        )
                      }
                      placeholder="Enter your city"
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* Course */}
                <div>
                  <label
                    htmlFor="course"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Course *
                  </label>

                  <select
                    id="course"
                    required
                    value={form.course}
                    onChange={(e) =>
                      updateField(
                        'course',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="">
                      Select a course
                    </option>

                    {resolvedCourse && (
                      <option value={resolvedCourse.name}>
                        {resolvedCourse.name}
                      </option>
                    )}

                    {!resolvedCourse && (
                      <>
                        <option value="Spoken English">
                          Spoken English
                        </option>
                        <option value="Abacus">
                          Abacus
                        </option>
                        <option value="Mathematics">
                          Mathematics
                        </option>
                        <option value="Science">
                          Science
                        </option>
                        <option value="English">
                          English
                        </option>
                        <option value="School Tuition">
                          School Tuition
                        </option>
                        <option value="Exam Preparation">
                          Exam Preparation
                        </option>
                      </>
                    )}
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label
                    htmlFor="mode"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Class Mode *
                  </label>

                  <select
                    id="mode"
                    required
                    value={form.mode}
                    onChange={(e) =>
                      updateField(
                        'mode',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="Online One-to-One">
                      Online One-to-One
                    </option>
                    <option value="Online Group Class">
                      Online Group Class
                    </option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Preferred Date *
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />

                    <input
                      id="date"
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) =>
                        updateField(
                          'date',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label
                    htmlFor="time"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Preferred Time *
                  </label>

                  <div className="relative">
                    <Clock3
                      size={17}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />

                    <input
                      id="time"
                      type="time"
                      required
                      value={form.time}
                      onChange={(e) =>
                        updateField(
                          'time',
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="mt-5">
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Additional Message
                </label>

                <textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    updateField(
                      'message',
                      e.target.value
                    )
                  }
                  placeholder="Tell us anything important about the student's learning requirements..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              {/* Submit */}
              <div className="mt-7">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors shadow-sm"
                >
                  <GraduationCap size={18} />
                  Book Tuition Session
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Our team will contact you to confirm availability
                and class timing.
              </p>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside>
            <div className="lg:sticky lg:top-24 space-y-5">
              {resolvedCourse && (
                <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white">
                      <GraduationCap size={22} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                        Selected Course
                      </p>

                      <h3 className="font-bold text-purple-950">
                        {resolvedCourse.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-purple-900/70 leading-relaxed">
                    {resolvedCourse.shortDescription}
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  Why Vattams Online Tuition?
                </h3>

                <ul className="space-y-3">
                  {[
                    'Live online learning',
                    'Flexible class scheduling',
                    'Personalised learning support',
                    'Experienced tutors',
                    'School and exam preparation',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-gray-600"
                    >
                      <CheckCircle2
                        size={17}
                        className="text-purple-600 mt-0.5 flex-shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => navigate('tuition-courses')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Course Catalog
              </button>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}