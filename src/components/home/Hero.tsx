import { Calendar, Star, ArrowRight, Briefcase } from 'lucide-react';
import { useRouter } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';
import CommunicationCenter from '@/components/CommunicationCenter';

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
          alt="Indian Home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-royal-950/95 via-royal-900/80 to-royal-800/50" />
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
            <Star size={14} className="text-gold-400 fill-gold-400" />
            <span className="text-white/90 text-sm font-medium">India's #1 Home Service Platform</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Professional Home Services{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              Across India
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-royal-100 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
            AC, Washing Machine, Refrigerator, Electrical, Plumbing and Home Appliance Services — 
            by verified technicians at your doorstep.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-12">
            <button
              onClick={() => navigate('booking')}
              className="group flex items-center gap-2 px-8 py-4 bg-royal-700 hover:bg-royal-600 text-white font-bold rounded-xl shadow-2xl shadow-royal-900/50 transition-all duration-300 hover:scale-105"
            >
              <Calendar size={18} />
              Book Service
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('join-technician')}
              className="group flex items-center gap-2 px-8 py-4 bg-wine-600 hover:bg-wine-500 text-white font-bold rounded-xl shadow-2xl shadow-wine-900/50 transition-all duration-300 hover:scale-105"
            >
              <Briefcase size={18} />
              Join as a Technician
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <CommunicationCenter className="!flex-row" />
          </div>

          {/* Social Links */}
          <SocialLinks variant="hero" />

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
                <div className="text-gold-200/90 text-xs font-medium mt-0.5">{s.label}</div>
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