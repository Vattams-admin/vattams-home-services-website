import { Calendar, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative bg-gradient-to-b from-ivory to-white pt-28 pb-14 md:pt-36 md:pb-20 overflow-hidden">
      {/* Subtle background accents (kept quiet, non-distracting) */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-royal-100/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-gold-100/50 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Content */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-royal-50 border border-royal-100 rounded-full px-4 py-1.5 mb-6">
              <Star size={13} className="text-gold-500 fill-gold-500" />
              <span className="text-royal-800 text-xs font-semibold tracking-wide">Trusted Home Services</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[2.25rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.1] font-bold text-royal-950 mb-5">
              Professional Home Services,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-600 to-gold-400">
                At Your Doorstep.
              </span>
            </h1>

            {/* Supporting text */}
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Verified technicians for AC, appliance, electrical, plumbing and home services — booked in minutes.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-center lg:justify-start">
              <button
                onClick={() => navigate('booking')}
                className="group flex items-center justify-center gap-2 px-7 py-4 bg-royal-800 hover:bg-royal-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-royal-900/20 transition-all duration-300"
              >
                <Calendar size={18} />
                Book a Service
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('services')}
                className="flex items-center justify-center gap-2 px-7 py-4 bg-white hover:bg-gray-50 text-royal-800 font-bold text-sm rounded-xl border-2 border-royal-100 transition-colors"
              >
                Explore Services
              </button>
            </div>

            {/* Micro trust line */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck size={16} className="text-royal-700" />
              Background-verified technicians · Transparent pricing
            </div>
          </div>

          {/* Image */}
          <div className="mt-10 lg:mt-0">
            <div className="relative rounded-3xl overflow-hidden shadow-xl mx-auto max-w-md lg:max-w-none aspect-[4/3] lg:aspect-[5/4]">
              <img
                src="https://images.pexels.com/photos/33671149/pexels-photo-33671149.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80"
                alt="VATTAMS verified technician servicing a home appliance"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-royal-950/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}