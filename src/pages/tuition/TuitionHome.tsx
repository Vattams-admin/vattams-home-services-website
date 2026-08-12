import {
  GraduationCap,
  Mic,
  Calculator,
  FlaskConical,
  BookOpen,
  Laptop,
  FileText,
  Trophy,
  School,
  ArrowRight,
} from 'lucide-react';

type Category = {
  label: string;
  icon: typeof GraduationCap;
};

const categories: Category[] = [
  { label: 'Online School Tuition', icon: School },
  { label: 'Spoken English', icon: Mic },
  { label: 'Abacus', icon: Calculator },
  { label: 'Mathematics', icon: Calculator },
  { label: 'Science', icon: FlaskConical },
  { label: 'English', icon: BookOpen },
  { label: 'Computer / Coding', icon: Laptop },
  { label: 'Exam Preparation', icon: FileText },
  { label: 'Competitive Exam Preparation', icon: Trophy },
];

export default function TuitionHome() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Vattams Online Tuition
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Trusted, personalized online learning for school students and
            competitive exam aspirants — from the same team behind Vattams
            Home Services.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Explore Courses
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-xl transition-colors"
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Courses We Offer
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose from a wide range of subjects taught by experienced,
            verified tutors.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.label}
                className="flex items-center gap-4 p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                  <Icon size={24} />
                </div>
                <span className="font-semibold text-gray-900">
                  {category.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= CTA STRIP ================= */}
      <section className="bg-slate-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-14 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
            Not sure where to start?
          </h3>
          <p className="text-gray-600 mb-6">
            Book a free trial class and we'll help you find the right course.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Explore Courses
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold rounded-xl transition-colors"
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
