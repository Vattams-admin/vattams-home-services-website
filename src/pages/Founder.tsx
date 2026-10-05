import {
  Sparkles,
  Lightbulb,
  Hammer,
  TrendingUp,
  Rocket,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  Wrench,
  Briefcase,
  Phone,
  Mail,
  Globe,
  MapPin,
  Linkedin,
  Quote,
  LucideIcon,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useSEO } from '@/lib/seo';

/* ============================================================
   DATA — every fact below already exists in the project
   (photo path, contact details, MSME number, LinkedIn URL).
   Nothing here is invented.
============================================================ */

const journey: { label: string; icon: LucideIcon }[] = [
  { label: 'Idea', icon: Lightbulb },
  { label: 'Build', icon: Hammer },
  { label: 'Improve', icon: TrendingUp },
  { label: 'Scale', icon: Rocket },
];

const philosophy: { quote: string; icon: LucideIcon }[] = [
  { quote: 'Trust comes first.', icon: ShieldCheck },
  { quote: 'Technology should make life simpler.', icon: Zap },
  { quote: 'Build for people, not just numbers.', icon: Users },
  { quote: 'Think long-term. Build patiently.', icon: Hammer },
];

export default function Founder() {
  const { navigate } = useRouter();

  useSEO({
    title: 'Founder | VATTAMS — Venkatesan Ponniah',
    description:
      'Meet Venkatesan Ponniah, Founder of VATTAMS, and discover the vision behind VATTAMS Home Services.',
    path: '/#founder',
  });

  return (
    <div className="pt-20 md:pt-24 bg-navy-950 overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-navy-950">
        {/* Cinematic backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(76,47,140,0.25),transparent_55%)] pointer-events-none" />
        {/* Subtle particle-like glow dots */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[8%] w-1.5 h-1.5 rounded-full bg-gold-400/40 animate-pulse" />
          <div className="absolute top-[65%] left-[18%] w-1 h-1 rounded-full bg-gold-300/30 animate-pulse [animation-delay:0.6s]" />
          <div className="absolute top-[30%] right-[12%] w-1.5 h-1.5 rounded-full bg-gold-400/30 animate-pulse [animation-delay:1.1s]" />
          <div className="absolute top-[78%] right-[22%] w-1 h-1 rounded-full bg-gold-300/40 animate-pulse [animation-delay:1.6s]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div className="lg:col-span-3 animate-[fadeIn_0.8s_ease-out]">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-gold-400/30 rounded-full px-4 py-2 mb-8">
                <Sparkles size={14} className="text-gold-400" />
                <span className="text-white/90 text-xs sm:text-sm font-medium tracking-widest uppercase">
                  Founder, VATTAMS
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6 tracking-tight">
                THE PERSON
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300">
                  BEHIND THE DREAM
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-white/90 font-semibold mb-2">
                Venkatesan Ponniah
              </p>
              <p className="text-gold-300/80 text-sm sm:text-base font-medium uppercase tracking-widest mb-8">
                Founder, VATTAMS
              </p>

              <p className="text-navy-100/80 text-base sm:text-lg leading-relaxed max-w-xl mb-2 italic">
                "Every big company starts with a dream.
                <br />
                VATTAMS started with one."
              </p>

              <p className="text-navy-100/70 text-base leading-relaxed max-w-xl mt-6">
                Building VATTAMS with a vision to create a trusted digital ecosystem where
                people can access dependable professional home services and connect through technology.
              </p>
            </div>

            {/* Portrait — premium glass card with spotlight */}
            <div className="lg:col-span-2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Spotlight glow behind portrait */}
                <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.25),transparent_70%)] blur-2xl" />
                <div className="relative bg-white/[0.04] backdrop-blur-md border border-gold-400/20 rounded-[2rem] p-3 shadow-2xl shadow-black/40">
                  <img
                    src="/images/file_0000000068408208aecee2ee49e66798.jpg"
                    alt="Venkatesan Ponniah, Founder of VATTAMS"
                    className="w-64 sm:w-72 md:w-80 aspect-[3/4] object-cover object-top rounded-3xl"
                  />
                  <div className="absolute inset-3 rounded-3xl ring-1 ring-inset ring-gold-400/20 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 inset-x-0 leading-none">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full block">
            <path d="M0 60L1440 60L1440 20C1200 60 800 0 400 35C200 50 0 20 0 20L0 60Z" fill="#0A132A" />
          </svg>
        </div>
      </section>

      {/* ================= FROM AN IDEA TO A VISION ================= */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/10 text-gold-300 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-6 tracking-wide uppercase">
            The Story
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
            FROM AN IDEA TO A VISION
          </h2>
          <p className="text-navy-100/80 text-base sm:text-lg leading-relaxed mb-6">
            VATTAMS represents a long-term vision to build something meaningful — not just
            another website or service business, but a technology-driven ecosystem that can
            grow with people and communities.
          </p>
          <p className="text-navy-100/80 text-base sm:text-lg leading-relaxed">
            From home services to professional technician support, the goal is simple: make trusted services
            easier to discover, access and manage.
          </p>
        </div>
      </section>

      {/* ================= JOURNEY TIMELINE ================= */}
      <section className="bg-navy-950 py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              THE JOURNEY IS JUST BEGINNING
            </h2>
            <p className="text-navy-100/70 max-w-xl mx-auto text-base md:text-lg">
              VATTAMS is being built step by step, with every improvement shaped by real-world
              needs.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-4 relative">
            <div className="hidden sm:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
            {journey.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-gold-400/25 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                    <Icon size={26} className="text-gold-400" />
                  </div>
                  <div className="text-[11px] font-bold text-gold-500/70 tracking-widest mb-1">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-white font-semibold text-sm sm:text-base">{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FOUNDER'S PHILOSOPHY ================= */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gold-400/10 text-gold-300 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
              Founder's Philosophy
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
              What Guides This Journey
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {philosophy.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.quote}
                  className="group bg-white/[0.04] backdrop-blur-sm border border-gold-400/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-gold-400/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <Quote size={22} className="text-gold-500/50 mb-4" />
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Icon size={20} className="text-white" />
                  </div>
                  <p className="text-white font-semibold text-base leading-snug">"{p.quote}"</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= VISION (cinematic) ================= */}
      <section className="relative bg-gradient-to-br from-navy-950 via-royal-950 to-navy-950 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.10),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-10 tracking-tight">
            MY VISION FOR VATTAMS
          </h2>
          <p className="text-navy-100/85 text-lg md:text-xl leading-relaxed mb-6 max-w-2xl mx-auto">
            I envision VATTAMS becoming a trusted home services platform connecting people
            with reliable technicians and dependable service experiences across India.
          </p>
          <p className="text-navy-100/75 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Reliable home services are at the heart of VATTAMS.
          </p>
          <p className="font-display text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 leading-snug">
            One platform.
            <br />
            Multiple possibilities.
            <br />
            One VATTAMS.
          </p>
        </div>
      </section>

      {/* ================= VATTAMS ECOSYSTEM ================= */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gold-400/10 text-gold-300 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
              The Ecosystem
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
              One Vision, Two Beginnings
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <button
              onClick={() => navigate('services')}
              className="group text-left bg-white/[0.04] border border-gold-400/10 rounded-2xl p-8 hover:bg-white/[0.07] hover:border-gold-400/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 border border-gold-400/20 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <Wrench size={26} className="text-gold-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">VATTAMS HOME SERVICES</h3>
              <p className="text-navy-100/70 text-sm leading-relaxed">
                Connecting customers with professional home service networks.
              </p>
            </button>

          </div>
        </div>
      </section>

      {/* ================= INDIA VISION (CSS/SVG abstract) ================= */}
      <section className="relative bg-navy-950 py-20 md:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight leading-tight">
                BUILT FROM INDIA.
                <br />
                <span className="text-gold-400">DREAMING FOR INDIA.</span>
              </h2>
              <p className="text-navy-100/75 text-base md:text-lg leading-relaxed max-w-lg">
                VATTAMS is being developed with an India-wide vision — starting step by step
                and growing responsibly.
              </p>
            </div>

            {/* Abstract India visual, built purely with CSS/SVG — no external image asset exists for this. */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_70%)] blur-xl" />
                <svg
                  viewBox="0 0 200 200"
                  className="relative w-full h-full"
                  role="img"
                  aria-label="Abstract representation of India's map"
                >
                  {/* Simplified abstract India silhouette — decorative, not geographically precise */}
                  <path
                    d="M100 12 C120 14 132 30 130 48 C142 52 150 64 146 78 C158 84 162 98 154 110 C160 122 156 138 142 146 C140 160 128 172 112 174 C108 182 96 184 88 178 C74 182 60 174 56 160 C42 156 34 142 38 128 C28 120 26 104 36 92 C32 78 40 64 54 58 C54 44 64 30 78 26 C82 16 92 10 100 12 Z"
                    fill="none"
                    stroke="url(#goldGrad)"
                    strokeWidth="1.5"
                    opacity="0.8"
                  />
                  <path
                    d="M100 12 C120 14 132 30 130 48 C142 52 150 64 146 78 C158 84 162 98 154 110 C160 122 156 138 142 146 C140 160 128 172 112 174 C108 182 96 184 88 178 C74 182 60 174 56 160 C42 156 34 142 38 128 C28 120 26 104 36 92 C32 78 40 64 54 58 C54 44 64 30 78 26 C82 16 92 10 100 12 Z"
                    fill="url(#goldGrad)"
                    opacity="0.06"
                  />
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#F5E9C2" />
                    </linearGradient>
                  </defs>
                  {/* Glowing location points, purely decorative */}
                  {[
                    [100, 40],
                    [70, 90],
                    [120, 110],
                    [95, 150],
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="3" fill="#D4AF37" opacity="0.8">
                      <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PERSONAL NOTE ================= */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/10 text-gold-300 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-8 tracking-wide uppercase">
            A Note From The Founder
          </div>

          <p className="font-display text-xl sm:text-2xl text-white/90 leading-relaxed mb-8 italic">
            "VATTAMS is more than a business idea to me. It is a dream that I want to build
            patiently, improve continuously and eventually make useful to millions of people."
          </p>
          <p className="text-navy-100/75 text-base sm:text-lg leading-relaxed mb-10">
            Every screen, every service and every improvement is another step toward that
            vision.
          </p>

          <p className="text-navy-100/80 text-base mb-6">Thank you for being part of the journey.</p>

          {/* Signature-inspired closing — no fabricated signature graphic, since none exists in the project. */}
          <div className="inline-block border-t border-gold-400/30 pt-5">
            <p className="font-display text-2xl text-gold-300 italic">Venkatesan Ponniah</p>
            <p className="text-navy-100/60 text-xs uppercase tracking-widest mt-1">Founder, VATTAMS</p>
          </div>
        </div>
      </section>

      {/* ================= REGISTERED & CONNECT ================= */}
      <section className="bg-navy-950 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white/[0.04] border border-gold-400/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-gold-400" />
                <h3 className="text-white font-bold text-sm">MSME (Udyam) Registered Enterprise</h3>
              </div>
              <p className="text-navy-100/60 text-sm">Government of India — Udyam Registered Enterprise</p>
              <p className="mt-2 text-gold-300 text-sm font-semibold">UDYAM-TN-02-0274720</p>
            </div>

            <div className="bg-white/[0.04] border border-gold-400/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm mb-3">Connect</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-navy-100/70">
                  <Phone size={14} className="text-gold-400 shrink-0" /> +91 63828 39861
                </li>
                <li className="flex items-center gap-2 text-navy-100/70">
                  <Mail size={14} className="text-gold-400 shrink-0" /> info@vattams.net
                </li>
                <li className="flex items-center gap-2 text-navy-100/70">
                  <Globe size={14} className="text-gold-400 shrink-0" /> www.vattams.net
                </li>
                <li className="flex items-center gap-2 text-navy-100/70">
                  <MapPin size={14} className="text-gold-400 shrink-0" /> Chennai, Tamil Nadu, India
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/venkatesan-ponniah-371760427"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold-300 hover:text-gold-200 font-medium transition-colors mt-1"
                  >
                    <Linkedin size={14} className="shrink-0" /> LinkedIn Profile
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-10 tracking-tight">
            BE PART OF THE VATTAMS JOURNEY
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('home')}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-950 font-bold rounded-lg shadow-xl shadow-gold-900/20 transition-all duration-300"
            >
              <Sparkles size={17} />
              Explore VATTAMS
            </button>
            <button
              onClick={() => navigate('booking')}
              className="flex items-center gap-2 px-6 py-3.5 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <Calendar size={16} />
              Book a Service
            </button>
            <button
              onClick={() => navigate('join-technician')}
              className="flex items-center gap-2 px-6 py-3.5 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <Briefcase size={16} />
              Join Our Network
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}