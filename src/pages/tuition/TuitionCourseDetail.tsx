import { GraduationCap, Users, Monitor, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { getTuitionCourseBySlug } from './tuitionCoursesData';
import CourseMaterialsSection from '@/components/tuition/materials/CourseMaterialsSection';

export default function TuitionCourseDetail() {
  const { tuitionCourseSlug, navigate } = useRouter();
  const course = getTuitionCourseBySlug(tuitionCourseSlug);

  if (!course) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Course not found
          </h1>
          <p className="text-gray-600 mb-8">
            The course you're looking for doesn't exist or may have moved.
          </p>
          <button
            type="button"
            onClick={() => navigate('tuition-courses')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Course Catalog
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
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
            {course.category}
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {course.name}
          </h1>

          <p className="text-purple-100 text-base max-w-2xl">
            {course.shortDescription}
          </p>

          <div className="flex flex-wrap gap-5 mt-6 text-sm text-purple-100">
            <div className="flex items-center gap-1.5">
              <Users size={15} className="text-purple-300" />
              {course.suitableFor}
            </div>
            <div className="flex items-center gap-1.5">
              <Monitor size={15} className="text-purple-300" />
              {course.mode}
            </div>
          </div>
        </div>
      </section>

      {/* ================= DETAILS ================= */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Overview
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {course.overview}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Who It's For
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {course.whoItIsFor}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                What You'll Learn
              </h2>
              <ul className="space-y-3">
                {course.whatYouWillLearn.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-gray-600">
                    <CheckCircle2 size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Class Format
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {course.classFormat}
              </p>
            </div>

            <div>
              <CourseMaterialsSection courseSlug={course.slug} />
            </div>
          </div>

          {/* ================= SIDEBAR CTA ================= */}
          <div>
            <div className="sticky top-24 p-6 rounded-2xl border border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Ready to get started?
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                Book a session or get in touch to learn more about{' '}
                {course.name}.
              </p>
              <button
                type="button"
                onClick={() => navigate('booking')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
              >
                Book Now
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}