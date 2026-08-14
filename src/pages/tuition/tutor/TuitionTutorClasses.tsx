import { GraduationCap } from 'lucide-react';

// NOTE: Real tutor registration/auth does not exist yet (no tuition_tutors
// table, no tutor session). This page intentionally shows a "not connected"
// empty state instead of any tutor identity, classes, schedule, or
// attendance data. Do not reintroduce demo/mock data here — once tutor
// auth exists, this page should load the signed-in tutor's real classes
// from Supabase instead.

export default function TuitionTutorClasses() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide mb-1">
            Vattams Online Tuition
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">My Classes</h1>
          <p className="text-purple-100 text-sm mt-1">
            Classes, schedule, and attendance for tutors.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="mx-auto max-w-xl text-center rounded-3xl border border-dashed border-gray-300 bg-white p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <GraduationCap size={26} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            No tutor account connected yet
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your tutor classes, schedule and attendance will appear here
            after tutor registration and approval.
          </p>
        </div>
      </section>
    </main>
  );
}