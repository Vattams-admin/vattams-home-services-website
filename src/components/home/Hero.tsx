import { Calendar, Star, ArrowRight, Phone, Home, ShieldCheck, BadgeCheck, Clock3, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';
import SafeImage from '@/components/SafeImage';

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-navy-950">
      {/* Background */}
      <div className="absolute inset-0">
        <SafeImage
          src="https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
          alt="Indian Home"
          className="w-full h-full object-cover"
          fallbackIcon={Home}
          fallbackIconSize={72}
        />
        {/* Strong dark navy gradient overlay for readability over a bright photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/40" />
      </div>

      {/* Subtle gold vignette accent, no floating particles */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.10),transparent_55%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-gold-400/30 rounded-full px-4 py-2 mb-7">
            <Star size={14} className="text-gold-400 fill-gold-400" />
            <span className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">Premium Appliance Care</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
            Expert Appliance Care{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300">
              At Your Doorstep
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-navy-100/90 text-base sm:text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
            Specialist AC, washing machine and refrigerator service, delivered with clear communication, careful workmanship and convenient doorstep booking.
          </p>

          {/* CTA Buttons — one primary, one secondary */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
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

          {/* De-emphasized secondary link — preserves technician sign-up access without competing with primary CTAs */}
          <button
            onClick={() => navigate('join-technician')}
            className="text-gold-300/90 hover:text-gold-200 text-sm font-medium underline underline-offset-4 decoration-gold-400/40 mb-10 transition-colors"
          >
            Technicians: Get Call Rate Jobs • Join for ₹49 →
          </button>

          {/* Social Links */}
          <SocialLinks variant="hero" />

          {/* Trust indicators — factual, non-numeric claims only */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <div className="flex flex-wrap gap-x-10 gap-y-6">
              {[
                { icon: ShieldCheck, label: 'Verified Technicians' },
                { icon: BadgeCheck, label: 'Transparent Pricing' },
                { icon: Clock3, label: 'Convenient Booking' },
                { icon: Sparkles, label: 'Quality Assured' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-x-10">
                  <div className="flex items-center gap-2.5">
                    <s.icon size={20} className="text-gold-400 shrink-0" />
                    <div className="text-white text-sm font-semibold tracking-tight">{s.label}</div>
                  </div>
                  {i < 3 && <div className="hidden sm:block w-px h-8 bg-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 inset-x-0 leading-none">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full block">
          <path d="M0 80L1440 80L1440 30C1200 80 800 0 400 50C200 70 0 30 0 30L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}