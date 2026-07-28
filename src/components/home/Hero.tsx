import { Phone, MessageCircle, Calendar, Star, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
          alt="Tamil Nadu Home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-900/80 to-blue-800/50" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5 animate-pulse"
            style={{
              width: `${40 + i * 20}px`,
              height: `${40 + i * 20}px`,
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-white/90 text-sm font-medium">Tamil Nadu's #1 Home Service Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Professional Home Services{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Across Tamil Nadu
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-blue-100 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
            AC, Washing Machine, Refrigerator, Electrical, Plumbing and Home Appliance Services — 
            by verified technicians at your doorstep.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-12">
            <button
              onClick={() => navigate('booking')}
              className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-2xl shadow-blue-900/50 transition-all duration-300 hover:scale-105"
            >
              <Calendar size={18} />
              Book Service
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Phone size={18} />
              Call Now
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl shadow-xl shadow-green-900/40 transition-all duration-300 hover:scale-105"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '10,000+', label: 'Happy Customers' },
              { value: '500+', label: 'Technicians' },
              { value: '30+', label: 'Cities' },
              { value: '4.9★', label: 'Rating' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-blue-200 text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full">
          <path d="M0 80L1440 80L1440 30C1200 80 800 0 400 50C200 70 0 30 0 30L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
