import { Calendar, Phone, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

// Final call-to-action banner shown at the bottom of the Home page.
// Focused exclusively on VATTAMS Home Services.
export default function CTASection() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          Premium Appliance Care. One Trusted Platform.
        </h2>
        <p className="text-navy-100/80 text-base md:text-lg mb-10 max-w-xl mx-auto">
          Book AC, washing machine or refrigerator service with a clear, convenient doorstep experience.
        </p>

        <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
          <h3 className="text-white font-bold text-lg mb-2">Need Appliance Care?</h3>
          <p className="text-navy-100/70 text-sm mb-6">
            Choose from our three focused services: AC, washing machine and refrigerator care.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('booking')}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-950 font-bold rounded-lg shadow-lg shadow-gold-900/20 transition-all duration-300"
            >
              <Calendar size={17} />
              Book a Service
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="tel:+916374068296"
              className="flex items-center gap-2 px-5 py-3 border border-white/25 text-white font-semibold text-sm rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <Phone size={15} />
              Call Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}