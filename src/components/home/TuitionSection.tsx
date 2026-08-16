import {
  GraduationCap,
  Calculator,
  Mic,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from '@/lib/router';

const featuredCourses = [
  {
    label: 'Abacus',
    description: 'Foundation to Advanced levels for young learners.',
    icon: Calculator,
  },
  {
    label: 'Public Speaking',
    description: 'Build confidence and communication skills.',
    icon: Mic,
  },
];

const otherCourses = [
  'School Tuition',
  'Mathematics',
  'Science',
  'CBSE / ICSE / State Board',
  'Competitive Exam Preparation',
];

export default function TuitionSection() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-20 bg-royal-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
            <GraduationCap size={16} />
            VATTAMS Online Tuition
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            Online Tuition Across India
          </h2>
          <p className="text-blue-100 text-base max-w-xl mx-auto">
            Learn. Grow. Succeed.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {featuredCourses.map((course) => {
            const Icon = course.icon;
            return (
              <div
                key={course.label}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-blue-200" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">
                    {course.label}
                  </h3>
                  <p className="text-blue-100/80 text-sm">
                    {course.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {otherCourses.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-blue-100"
            >
              <BookOpen size={14} />
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('tuition-home')}
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all duration-300"
          >
            Explore Online Tuition
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('tuition-courses')}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Join Now
          </button>
          <button
            onClick={() => navigate('tuition-booking')}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Book Trial – ₹150
          </button>
        </div>
      </div>
    </section>
  );
}