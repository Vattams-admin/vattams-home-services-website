import {
  Target, Eye, ShieldCheck, Award, Handshake, MapPin, Wrench, Sparkles, Wind,
  Refrigerator, Camera, Droplets, Zap, Layers, Search, MousePointerClick, Link2,
  PartyPopper, Cpu, Globe2, Lock, ClipboardCheck, UserCheck, HeartHandshake,
  CalendarCheck, LucideIcon,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { cities } from '@/lib/cities';
import { useSEO } from '@/lib/seo';

const homeServices: { label: string; icon: LucideIcon }[] = [
  { label: 'AC Service', icon: Wind },
  { label: 'Washing Machine Service', icon: Layers },
  { label: 'Refrigerator Repair', icon: Refrigerator },
  { label: 'CCTV', icon: Camera },
  { label: 'Plumbing', icon: Droplets },
  { label: 'Electrical', icon: Zap },
];

const whyVattams: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Trusted Network', text: 'A single platform built around verified professionals and structured onboarding.', icon: ShieldCheck },
  { title: 'Technology Driven', text: 'Every booking, assignment and update runs through a modern digital workflow.', icon: Cpu },
  { title: 'Customer Focused', text: 'Designed around clear service discovery, booking and support.', icon: HeartHandshake },
  { title: 'Professional Network', text: 'Connecting verified technicians with people who need reliable home services.', icon: Handshake },
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
  { title: 'Customer-Focused Experience', text: 'Every part of the platform is built around a smooth customer experience.', icon: HeartHandshake },
];

export default function About() {
  const { navigate } = useRouter();

  useSEO({
    title: 'About VATTAMS | Home Services',
    description: 'Learn about VATTAMS Home Services, a trusted platform connecting customers with professional technicians across India.',
    path: '/#about',
  });

  const citiesByState = cities.reduce((acc, city) => {
    (acc[city.state] ||= []).push(city);
    return acc;
  }, {} as Record<string, typeof cities>);

  const goToCity = (slug: string) => {
    window.location.hash = `city-${slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pt-20 md:pt-24 bg-navy-950 overflow-x-hidden">
      <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_55%)] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 w-full text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-gold-400/30 rounded-full px-4 py-2 mb-8">
            <Sparkles size={14} className="text-gold-400" aria-hidden="true" />
            <span className="text-white/90 text-xs sm:text-sm font-medium tracking-widest uppercase">About Us</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">VATTAMS Home Services</h1>
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 text-xl sm:text-2xl md:text-3xl font-bold mb-8 tracking-wide">One Trusted Platform for Home Services</p>
          <p className="text-navy-100/80 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            VATTAMS connects customers with professional technicians for dependable home repair, maintenance and installation services across India.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 mb-6">About VATTAMS</h2>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
            VATTAMS is a home-services platform focused on making professional repair, maintenance and installation services easier to discover, book and manage.
          </p>
          <button onClick={() => navigate('services')} className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:text-gold-800 text-sm">
            Explore Home Services →
          </button>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14"><h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900">Our Home Services</h2></div>
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-7 md:p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-royal-800 flex items-center justify-center shrink-0"><Wrench size={22} className="text-white" aria-hidden="true" /></div>
              <h3 className="font-display font-bold text-royal-900 text-xl">VATTAMS Home Services</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Reliable professional services when you need them.</p>
            <ul className="grid grid-cols-2 gap-3 mb-6">
              {homeServices.map((service) => { const Icon = service.icon; return (
                <li key={service.label} className="flex items-center gap-2 bg-gold-50 rounded-xl px-3 py-2.5 text-sm text-gray-700">
                  <Icon size={16} className="text-gold-700 shrink-0" aria-hidden="true" />{service.label}
                </li>
              ); })}
            </ul>
            <button onClick={() => navigate('services')} className="inline-flex items-center gap-2 text-gold-700 font-semibold hover:text-gold-800 text-sm">Explore Services →</button>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-royal-800 flex items-center justify-center mx-auto mb-4"><Eye size={26} className="text-white" /></div>
              <h3 className="font-display font-bold text-royal-900 text-lg mb-2">Our Vision</h3>
              <p className="text-gray-500 text-sm leading-relaxed">To build a trusted home-services network that makes dependable professional help accessible across India.</p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-gold-600 flex items-center justify-center mx-auto mb-4"><Target size={26} className="text-white" /></div>
              <h3 className="font-display font-bold text-royal-900 text-lg mb-2">Our Mission</h3>
              <p className="text-gray-500 text-sm leading-relaxed">To make home-service discovery, booking, technician assignment and support simple and reliable.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14"><h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900">Why VATTAMS</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyVattams.map((item) => { const Icon = item.icon; return (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-12 h-12 rounded-xl bg-royal-800 flex items-center justify-center mb-4"><Icon size={22} className="text-white" /></div>
                <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.text}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      <section className="bg-navy-950 py-16 md:py-24 relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14"><h2 className="font-display text-2xl md:text-4xl font-bold text-white">How It Works</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4 relative mb-12">
            {journeySteps.map((step, i) => { const Icon = step.icon; return (
              <div key={step.label} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-gold-400/25 flex items-center justify-center mb-4"><Icon size={26} className="text-gold-400" /></div>
                <div className="text-[11px] font-bold text-gold-500/70 tracking-widest mb-1">{String(i + 1).padStart(2, '0')}</div>
                <div className="text-white font-semibold text-sm sm:text-base">{step.label}</div>
              </div>
            ); })}
          </div>
          <div className="max-w-2xl mx-auto bg-white/[0.04] border border-gold-400/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3"><Wrench size={16} className="text-gold-400" /><h3 className="text-white font-bold text-sm uppercase tracking-wide">Home Service Workflow</h3></div>
            <p className="text-navy-100/70 text-sm leading-relaxed">Find a service → Book → Technician assignment → Service completion</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14"><h2 className="font-display text-2xl md:text-4xl font-bold text-white">Built with Trust at the Core</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPoints.map((item) => { const Icon = item.icon; return (
              <div key={item.title} className="text-center">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3"><Icon size={22} className="text-gold-300" /></div>
                <div className="text-white text-sm font-bold mb-1">{item.title}</div>
                <p className="text-gold-100/70 text-xs leading-relaxed">{item.text}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-royal-900 text-center mb-3">Cities We Serve</h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">VATTAMS Home Services operates in {cities.length}+ cities across India — tap a city to see local services.</p>
          <div className="space-y-8 max-w-5xl mx-auto">
            {Object.entries(citiesByState).map(([state, list]) => (
              <div key={state}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{state}</h3>
                <div className="flex flex-wrap gap-2.5">
                  {list.map((city) => (
                    <button key={city.slug} onClick={() => goToCity(city.slug)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-700 shadow-sm hover:border-gold-300 hover:text-gold-700 transition-colors">
                      <MapPin size={12} className="text-gold-600" />{city.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex flex-col items-center gap-2 bg-gray-50 rounded-2xl border border-gold-200 shadow-sm px-8 py-6">
            <div className="inline-flex items-center gap-2 text-gold-700"><Award size={20} /><span className="font-bold text-sm uppercase tracking-wider">Government of India MSME Registered</span></div>
            <p className="text-gray-500 text-sm">Udyam Registration No: <span className="font-bold text-gray-700">UDYAM-TN-02-0274720</span></p>
          </div>
        </div>
      </section>

      <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white mb-10">Ready to book a home service?</h2>
          <button onClick={() => navigate('booking')} className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold-400 to-gold-500 text-navy-950 font-bold rounded-lg shadow-xl shadow-gold-900/20">
            <CalendarCheck size={17} />Book a Service
          </button>
        </div>
      </section>
    </div>
  );
}
