import { Calendar, Phone, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function CTASection() {
  const { navigate } = useRouter();

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.10),transparent_60%)]" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-navy-900 to-navy-950 rounded-3xl p-10 md:p-16 shadow-2xl shadow-navy-900/30 border border-gold-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Need a Home Service Today?
            </h2>
            <p className="text-gold-100/80 text-lg mb-8 max-w-xl mx-auto">
              Book in 60 seconds. Our verified technician will be at your doorstep.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('booking')}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-950 font-bold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Calendar size={18} />
                Book Service Now
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+918189800757"
                className="flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-bold rounded-lg hover:bg-white/20 hover:border-white/40 transition-all duration-300"
              >
                <Phone size={18} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}