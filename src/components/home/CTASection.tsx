import { Calendar, Phone, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

// Final call-to-action banner shown at the bottom of the Home page, after
// Testimonials. Kept intentionally simple and self-contained — it must
// never import Home or any other page-level component.
export default function CTASection() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to get your home service sorted?
        </h2>
        <p className="text-navy-100/80 text-base md:text-lg mb-10 max-w-xl mx-auto">
          Book a verified technician in minutes — transparent pricing, same-day service, and a 30-day warranty on every job.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate('booking')}
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-950 font-bold rounded-lg shadow-xl shadow-gold-900/20 transition-all duration-300"
          >
            <Calendar size={18} />
            Book a Service
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="tel:+916374068296"
            className="flex items-center gap-2 px-8 py-4 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
          >
            <Phone size={16} />
            Call Now
          </a>
        </div>
      </div>
    </section>
  );
}