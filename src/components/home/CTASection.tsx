import { Calendar, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function CTASection() {
  const { navigate } = useRouter();

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(219,234,254,0.5),transparent_60%)]" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-10 md:p-16 shadow-2xl shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Need a Home Service Today?
            </h2>
            <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
              Book in 60 seconds. Our verified technician will be at your doorstep.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('booking')}
                className="group flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <Calendar size={18} />
                Book Service Now
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                <Phone size={18} /> Call Now
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
