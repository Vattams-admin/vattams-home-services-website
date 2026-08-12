import { GraduationCap } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { tuitionCourses } from './tuitionCoursesData';
import TuitionCourseCard from '@/components/tuition/TuitionCourseCard';

export default function TuitionCourses() {
  const { navigate } = useRouter();

  const categories = Array.from(
    new Set(tuitionCourses.map((course) => course.category))
  );

  const handleView = (slug: string) => {
    navigate('tuition-course-detail', slug);
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Course Catalog
          </h1>
          <p className="text-purple-100 text-base max-w-2xl mx-auto">
            Browse our online tuition courses by category and find the right
            fit for your learning goals.
          </p>
        </div>
      </section>

      {/* ================= COURSES BY CATEGORY ================= */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        {categories.map((category) => {
          const coursesInCategory = tuitionCourses.filter(
            (course) => course.category === category
          );

          return (
            <div key={category} className="mb-14 last:mb-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                {category}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesInCategory.map((course) => (
                  <TuitionCourseCard
                    key={course.slug}
                    course={course}
                    onView={handleView}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}