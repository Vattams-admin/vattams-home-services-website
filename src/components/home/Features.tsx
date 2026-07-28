import { ShieldCheck, BadgeCheck, Clock, Package, Star, Radio } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Verified Technicians',
    description: 'All our technicians are background-verified, trained, and certified.',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    icon: BadgeCheck,
    title: 'Transparent Pricing',
    description: 'No hidden charges. Get clear pricing before work begins.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Clock,
    title: 'Same Day Service',
    description: 'Book now and get service on the same day in most cities.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Package,
    title: 'Genuine Spare Parts',
    description: 'We use only OEM-grade spare parts for all repairs.',
    gradient: 'from-purple-500 to-indigo-600',
  },
  {
    icon: Star,
    title: 'Service Warranty',
    description: '30-day service warranty on all repairs and installations.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: Radio,
    title: 'Live Booking Status',
    description: 'Track your booking status in real-time from your phone.',
    gradient: 'from-cyan-500 to-sky-600',
  },
];

export default function Features() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.15),transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Why Choose Us
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            The VATTAMS Advantage
          </h2>
          <p className="text-blue-200 max-w-xl mx-auto text-base md:text-lg">
            We go beyond repairs — we deliver peace of mind with every service.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-blue-200/80 text-sm leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
