import { Calendar, Phone, ArrowRight, GraduationCap } from 'lucide-react';
import { useRouter } from '@/lib/router';

// Final call-to-action banner shown at the bottom of the Home page, after
// Testimonials. Kept intentionally simple and self-contained — it must
// never import Home or any other page-level component.
//
// Presents both VATTAMS verticals side by side per the unified brand
// positioning (Home Services + Online Tuition), rather than Home Services
// alone.
export default function CTASection() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          One Platform. Endless Possibilities.
        </h2>
        <p className="text-navy-100/80 text-base md:text-lg mb-10 max-w-xl mx-auto">
          Whatever you need next — a home fixed or a skill learned — VATTAMS has you covered.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-4">
          {/* Home Services */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
            <h3 className="text-white font-bold text-lg mb-2">Need a Service?</h3>
            <p className="text-navy-100/70 text-sm mb-6">
              Book a verified technician in minutes — transparent pricing, same-day service, and a 30-day warranty on every job.
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

          {/* Online Tuition */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
            <h3 className="text-white font-bold text-lg mb-2">Ready to Learn?</h3>
            <p className="text-navy-100/70 text-sm mb-6">
              Join verified tutors for Abacus, Public Speaking, and more — with a ₹150 trial session to get started.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('tuition-home')}
                className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
              >
                <GraduationCap size={17} />
                Explore Online Tuition
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}