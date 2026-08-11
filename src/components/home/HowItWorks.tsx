import { Search, CalendarCheck, Wrench, ThumbsUp } from 'lucide-react';

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'Choose Your Service',
    description: 'Browse our services and select the one you need.',
    gradient: 'from-navy-800 to-navy-950',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Book a Slot',
    description: 'Pick your preferred date and time. Same-day available.',
    gradient: 'from-gold-500 to-gold-700',
  },
  {
    icon: Wrench,
    step: '03',
    title: 'Technician Arrives',
    description: 'Verified technician arrives and completes the job.',
    gradient: 'from-navy-700 to-navy-900',
  },
  {
    icon: ThumbsUp,
    step: '04',
    title: 'Pay & Rate',
    description: 'Pay after satisfaction. Rate your experience.',
    gradient: 'from-gold-600 to-gold-800',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-ivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            Simple Process
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-4">How It Works</h2>
          <p className="text-gray-500 max-w-lg mx-auto">Get your home service done in 4 easy steps.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-navy-200 via-gold-300 to-navy-200 mx-16 z-0" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="relative z-10 text-center group bg-white rounded-2xl border border-gold-100 shadow-sm hover:shadow-lg hover:border-gold-300 transition-all duration-300 p-6"
              >
                <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className="text-white" />
                </div>
                <div className="text-xs font-bold text-gold-600/80 mb-1 tracking-widest">{s.step}</div>
                <h3 className="font-extrabold text-navy-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}