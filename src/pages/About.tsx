import {
  Target,
  Eye,
  ShieldCheck,
  Award,
  Handshake,
  MapPin,
  Wrench,
  GraduationCap,
  Sparkles,
  Wind,
  Refrigerator,
  Camera,
  Droplets,
  Zap,
  BookOpen,
  Calculator,
  Mic,
  FlaskConical,
  GraduationCap as SchoolIcon,
  Trophy,
  Layers,
  Search,
  MousePointerClick,
  Link2,
  PartyPopper,
  Cpu,
  Users,
  Globe2,
  Lock,
  ClipboardCheck,
  UserCheck,
  HeartHandshake,
  Briefcase,
  CalendarCheck,
  LucideIcon,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { cities } from '@/lib/cities';
import { useSEO } from '@/lib/seo';

/* ============================================================
   DATA — every fact below already exists in the project
   (service list, tuition categories, MSME number, city count).
   Nothing here is invented.
============================================================ */

const homeServices: { label: string; icon: LucideIcon }[] = [
  { label: 'AC Service', icon: Wind },
  { label: 'Washing Machine Service', icon: Layers },
  { label: 'Refrigerator Repair', icon: Refrigerator },
  { label: 'CCTV', icon: Camera },
  { label: 'Plumbing', icon: Droplets },
  { label: 'Electrical', icon: Zap },
];

const tuitionCategories: { label: string; icon: LucideIcon }[] = [
  { label: 'School Tuition', icon: SchoolIcon },
  { label: 'Abacus', icon: Calculator },
  { label: 'Public Speaking', icon: Mic },
  { label: 'Maths', icon: Calculator },
  { label: 'Science', icon: FlaskConical },
  { label: 'CBSE / ICSE / State Board', icon: BookOpen },
  { label: 'Competitive Exam Preparation', icon: Trophy },
];

const whyVattams: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Trusted Ecosystem', text: 'A single platform built around verified professionals and structured onboarding.', icon: ShieldCheck },
  { title: 'Technology Driven', text: 'Every booking, assignment and update runs through a modern digital workflow.', icon: Cpu },
  { title: 'Customer Focused', text: 'Designed around what customers and learners actually need, not just features.', icon: Users },
  { title: 'Professional Network', text: 'Connecting verified technicians and tutors with the people who need them.', icon: Handshake },
  { title: 'Learning & Services in One Platform', text: 'Home services and online tuition, unified under one VATTAMS experience.', icon: Layers },
  { title: 'Built for India', text: 'Designed with an India-wide vision, growing step by step and responsibly.', icon: Globe2 },
];

const journeySteps: { label: string; icon: LucideIcon }[] = [
  { label: 'Discover', icon: Search },
  { label: 'Choose', icon: MousePointerClick },
  { label: 'Connect', icon: Link2 },
  { label: 'Experience', icon: PartyPopper },
];

const trustPoints: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Secure Digital Workflows', text: 'Bookings, assignments and payments flow through structured, secure processes.', icon: Lock },
  { title: 'Structured Service Management', text: 'Every service request is tracked from booking to completion.', icon: ClipboardCheck },
  { title: 'Professional Onboarding', text: 'Technicians go through a defined verification and onboarding process.', icon: UserCheck },
  { title: 'Student & Tutor Workflows', text: 'Structured flows connect learners with the right tutors and courses.', icon: GraduationCap },
  { title: 'Customer-Focused Experience', text: 'Every part of the platform is built around a smooth customer experience.', icon: HeartHandshake },
];

export default function About() {
  const { navigate } = useRouter();

  useSEO({
    title: 'About VATTAMS | Home Services & Online Tuition',
    description:
      'Learn about VATTAMS, a unified digital platform connecting professional home services and online tuition across India.',
    path: '/#about',
  });

  const citiesByState = cities.reduce((acc, c) => {
    (acc[c.state] ||= []).push(c);
    return acc;
  }, {} as Record<string, typeof cities>);

  const goToCity = (slug: string) => {
    window.location.hash = `city-${slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pt-20 md:pt-24 bg-navy-950 overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(76,47,140,0.25),transparent_55%)] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-gold-400/30 rounded-full px-4 py-2 mb-8">
            <Sparkles size={14} className="text-gold-400" aria-hidden="true" />
            <span className="text-white/90 text-xs sm:text-sm font-medium tracking-widest uppercase">
              About Us
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6 tracking-tight">
            VATTAMS
          </h1>
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 text-xl sm:text-2xl md:text-3xl font-bold mb-8 tracking-wide">
            One Platform. Endless Possibilities.
          </p>

          <p className="text-navy-100/80 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-14">
            VATTAMS is building a trusted digital ecosystem that brings professional home
            services and quality online learning together on one platform.
          </p>

          {/* Ecosystem cards */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate('services')}
              className="group bg-white/[0.04] border border-gold-400/10 rounded-2xl p-7 hover:bg-white/[0.07] hover:border-gold-400/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 border border-gold-400/20 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <Wrench size={24} className="text-gold-400" aria-hidden="true" />
              </div>
              <h2 className="text-white font-bold text-lg mb-1.5">Home Services</h2>
              <p className="text-navy-100/70 text-sm leading-relaxed mb-4">
                Professional services at your doorstep.
              </p>
              <span className="inline-flex items-center gap-1.5 text-gold-300 text-sm font-semibold group-hover:text-gold-200">
                Explore Home Services →
              </span>
            </button>

            <button
              onClick={() => navigate('tuition-home')}
              className="group bg-white/[0.04] border border-gold-400/10 rounded-2xl p-7 hover:bg-white/[0.07] hover:border-gold-400/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 border border-gold-400/20 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <GraduationCap size={24} className="text-gold-400" aria-hidden="true" />
              </div>
              <h2 className="text-white font-bold text-lg mb-1.5">Online Tuition</h2>
              <p className="text-navy-100/70 text-sm leading-relaxed mb-4">
                Learn. Grow. Succeed.
              </p>
              <span className="inline-flex items-center gap-1.5 text-gold-300 text-sm font-semibold group-hover:text-gold-200">
                Explore Online Tuition →
              </span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 leading-none">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full block" aria-hidden="true">
            <path d="M0 60L1440 60L1440 20C1200 60 800 0 400 35C200 50 0 20 0 20L0 60Z" fill="#FFFFFF" />
          </svg>
        </div>
      </section>

      {/* ================= ABOUT VATTAMS ================= */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 mb-6 tracking-tight">
            About VATTAMS
          </h2>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
            VATTAMS is designed as a unified platform connecting customers, professionals,
            students, tutors and trusted services through technology — bringing everyday
            home services and structured online learning together in one place.
          </p>
          <button
            onClick={() => navigate('founder')}
            className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:text-gold-800 text-sm"
          >
            Meet Our Founder →
          </button>
        </div>
      </section>

      {/* ================= OUR TWO VERTICALS ================= */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 tracking-tight">
              Our Two Verticals
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Home Services vertical */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-royal-800 flex items-center justify-center shrink-0">
                  <Wrench size={22} className="text-white" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-royal-900 text-xl">
                  VATTAMS Home Services
                </h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Reliable professional services when you need them.
              </p>
              <ul className="grid grid-cols-2 gap-3 mb-6">
                {homeServices.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li
                      key={s.label}
                      className="flex items-center gap-2 bg-gold-50 rounded-xl px-3 py-2.5 text-sm text-gray-700"
                    >
                      <Icon size={16} className="text-gold-700 shrink-0" aria-hidden="true" />
                      {s.label}
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => navigate('services')}
                className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:text-gold-800 text-sm"
              >
                Explore Home Services →
              </button>
            </div>

            {/* Online Tuition vertical */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shrink-0">
                  <GraduationCap size={22} className="text-white" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-royal-900 text-xl">
                  VATTAMS Online Tuition
                </h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Accessible online learning designed for students and learners.
              </p>
              <ul className="grid grid-cols-2 gap-3 mb-6">
                {tuitionCategories.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li
                      key={s.label}
                      className="flex items-center gap-2 bg-royal-50 rounded-xl px-3 py-2.5 text-sm text-gray-700"
                    >
                      <Icon size={16} className="text-royal-700 shrink-0" aria-hidden="true" />
                      {s.label}
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => navigate('tuition-home')}
                className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:text-gold-800 text-sm"
              >
                Explore Online Tuition →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VISION & MISSION ================= */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Eye size={26} className="text-white" aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-royal-900 text-lg mb-2">Our Vision</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                To build a trusted technology platform that connects everyday services and
                learning opportunities with people across India.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Target size={26} className="text-white" aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-royal-900 text-lg mb-2">Our Mission</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                To make professional services and quality learning easier to discover, access
                and manage through one digital platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY VATTAMS ================= */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 tracking-tight">
              Why VATTAMS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyVattams.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-royal-800 flex items-center justify-center mb-4">
                    <Icon size={22} className="text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-navy-950 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-white tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4 relative mb-16">
            <div className="hidden sm:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
            {journeySteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-gold-400/25 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                    <Icon size={26} className="text-gold-400" aria-hidden="true" />
                  </div>
                  <div className="text-[11px] font-bold text-gold-500/70 tracking-widest mb-1">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-white font-semibold text-sm sm:text-base">{step.label}</div>
                </div>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white/[0.04] border border-gold-400/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={16} className="text-gold-400" aria-hidden="true" />
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Home Services</h3>
              </div>
              <p className="text-navy-100/70 text-sm leading-relaxed">
                Find a service → Book → Technician assignment → Service completion
              </p>
            </div>
            <div className="bg-white/[0.04] border border-gold-400/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={16} className="text-gold-400" aria-hidden="true" />
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Online Tuition</h3>
              </div>
              <p className="text-navy-100/70 text-sm leading-relaxed">
                Choose a course → Join / Book → Connect with tutor → Learn
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INDIA-WIDE VISION ================= */}
      <section className="relative bg-white py-16 md:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 mb-6 tracking-tight leading-tight">
                Built for India.
                <br />
                <span className="text-gold-600">Designed to Scale.</span>
              </h2>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-lg">
                VATTAMS is building toward a connected platform serving customers and learners
                across India.
              </p>
            </div>

            {/* Abstract India visual, built purely with CSS/SVG — no external image asset used. */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_70%)] blur-xl" />
                <svg
                  viewBox="0 0 200 200"
                  className="relative w-full h-full"
                  role="img"
                  aria-label="Abstract representation of India's map"
                >
                  <path
                    d="M100 12 C120 14 132 30 130 48 C142 52 150 64 146 78 C158 84 162 98 154 110 C160 122 156 138 142 146 C140 160 128 172 112 174 C108 182 96 184 88 178 C74 182 60 174 56 160 C42 156 34 142 38 128 C28 120 26 104 36 92 C32 78 40 64 54 58 C54 44 64 30 78 26 C82 16 92 10 100 12 Z"
                    fill="none"
                    stroke="url(#aboutGoldGrad)"
                    strokeWidth="1.5"
                    opacity="0.85"
                  />
                  <path
                    d="M100 12 C120 14 132 30 130 48 C142 52 150 64 146 78 C158 84 162 98 154 110 C160 122 156 138 142 146 C140 160 128 172 112 174 C108 182 96 184 88 178 C74 182 60 174 56 160 C42 156 34 142 38 128 C28 120 26 104 36 92 C32 78 40 64 54 58 C54 44 64 30 78 26 C82 16 92 10 100 12 Z"
                    fill="url(#aboutGoldGrad)"
                    opacity="0.08"
                  />
                  <defs>
                    <linearGradient id="aboutGoldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#C9A227" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                  {[
                    [100, 40],
                    [70, 90],
                    [120, 110],
                    [95, 150],
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="3" fill="#C9A227" opacity="0.8">
                      <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST SECTION ================= */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-white tracking-tight">
              Built with Trust at the Core
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {trustPoints.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-gold-300" aria-hidden="true" />
                  </div>
                  <div className="text-white text-sm font-bold mb-1">{item.title}</div>
                  <p className="text-gold-100/70 text-xs leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CITIES WE SERVE ================= */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 text-center mb-3 tracking-tight">
            Cities We Serve
          </h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
            VATTAMS Home Services operates in {cities.length}+ cities across India — tap a city
            to see local services
          </p>
          <div className="space-y-8 max-w-5xl mx-auto">
            {Object.entries(citiesByState).map(([state, list]) => (
              <div key={state}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{state}</h3>
                <div className="flex flex-wrap gap-2.5">
                  {list.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => goToCity(c.slug)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-700 shadow-sm hover:border-gold-300 hover:text-gold-700 transition-colors"
                    >
                      <MapPin size={12} className="text-gold-600" aria-hidden="true" /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= MSME TRUST BADGE ================= */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex flex-col items-center gap-2 bg-gray-50 rounded-2xl border border-gold-200 shadow-sm px-8 py-6">
            <div className="inline-flex items-center gap-2 text-gold-700">
              <Award size={20} aria-hidden="true" />
              <span className="font-bold text-sm uppercase tracking-wider">Government of India MSME Registered</span>
            </div>
            <p className="text-gray-500 text-sm">
              Udyam Registration No: <span className="font-bold text-gray-700">UDYAM-TN-02-0274720</span>
            </p>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white mb-10 tracking-tight">
            Welcome to the VATTAMS ecosystem.
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('booking')}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-950 font-bold rounded-lg shadow-xl shadow-gold-900/20 transition-all duration-300"
            >
              <CalendarCheck size={17} aria-hidden="true" />
              Book a Service
            </button>
            <button
              onClick={() => navigate('tuition-home')}
              className="flex items-center gap-2 px-6 py-3.5 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <GraduationCap size={16} aria-hidden="true" />
              Explore Online Tuition
            </button>
            <button
              onClick={() => navigate('join-technician')}
              className="flex items-center gap-2 px-6 py-3.5 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <Briefcase size={16} aria-hidden="true" />
              Join as a Technician
            </button>
            <button
              onClick={() => navigate('tuition-tutor-register')}
              className="flex items-center gap-2 px-6 py-3.5 border border-white/25 text-white font-semibold rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
            >
              <GraduationCap size={16} aria-hidden="true" />
              Join as a Tutor
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}