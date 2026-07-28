import { Search, CalendarCheck, Wrench, ThumbsUp } from 'lucide-react';

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'Choose Your Service',
    description: 'Browse our services and select the one you need.',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Book a Slot',
    description: 'Pick your preferred date and time. Same-day available.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Wrench,
    step: '03',
    title: 'Technician Arrives',
    description: 'Verified technician arrives and completes the job.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: ThumbsUp,
    step: '04',
    title: 'Pay & Rate',
    description: 'Pay after satisfaction. Rate your experience.',
    gradient: 'from-purple-500 to-indigo-600',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Simple Process
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">How It Works</h2>
          <p className="text-gray-500 max-w-lg mx-auto">Get your home service done in 4 easy steps.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-amber-200 to-teal-200 mx-16 z-0" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative z-10 text-center group">
                <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className="text-white" />
                </div>
                <div className="text-xs font-bold text-gray-300 mb-1 tracking-widest">{s.step}</div>
                <h3 className="font-extrabold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
