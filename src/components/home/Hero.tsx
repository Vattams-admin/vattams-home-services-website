import { ArrowRight, Calendar, Phone, Home, Wind, Refrigerator, WashingMachine, Search, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';
import SafeImage from '@/components/SafeImage';

const serviceShortcuts = [
  { label: 'Air conditioning', detail: 'Service · Installation · Repair', icon: Wind },
  { label: 'Washing machines', detail: 'Care · Troubleshooting', icon: WashingMachine },
  { label: 'Refrigerators', detail: 'Service · Repair requests', icon: Refrigerator },
];

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative isolate overflow-hidden bg-[#070B15] text-white">
      <div className="absolute inset-0">
        <SafeImage
          src="https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1920&q=85"
          alt="Contemporary living room with considered interior design"
          className="h-full w-full object-cover object-center"
          fallbackIcon={Home}
          fallbackIconSize={72}
        />
        <div className="absolute inset-0 bg-[#070B15]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070B15] via-[#070B15]/95 to-[#070B15]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B15] via-transparent to-[#070B15]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_20%,rgba(212,175,55,0.16),transparent_32%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
      <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-14 lg:py-24">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/25 px-4 py-2.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#DCC15D] shadow-[0_0_12px_rgba(220,193,93,.7)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:text-xs">VATTAMS · Home service marketplace</span>
          </div>

          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#E2C55C] sm:text-xs">
            Find a service. Make an informed choice.
          </p>
          <h1 className="max-w-3xl font-display text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.65rem]">
            Better care for
            <span className="block bg-gradient-to-r from-[#F4E5A2] via-[#D4AF37] to-[#B8872B] bg-clip-text pb-2 text-transparent">
              the things that
            </span>
            <span className="block">make a home.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-200/90 sm:text-base sm:leading-8">
            Explore appliance services, compare listed starting prices and send a clear request to the VATTAMS provider network — all in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => navigate('services')}
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#F0D36C] bg-gradient-to-r from-[#E5C34F] via-[#D4AF37] to-[#B98C27] px-7 py-4 text-sm font-bold text-[#111523] shadow-[0_12px_38px_rgba(212,175,55,.22)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <Search size={17} />
              Explore services
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate('booking')}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/25 bg-white/[0.05] px-7 py-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#D4AF37]/70 hover:bg-white/[0.09]"
            >
              <Calendar size={16} />
              Request a service
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-[#D4AF37]" /> Clear charge breakdown</span>
            <span className="hidden h-4 w-px bg-white/20 sm:block" />
            <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-[#D4AF37]" /> Availability varies by location</span>
          </div>

          <button
            onClick={() => navigate('join-technician')}
            className="mt-6 text-left text-xs font-medium text-[#E8D28A] underline decoration-[#D4AF37]/40 underline-offset-4 transition hover:text-white sm:text-sm"
          >
            Are you a service professional? Join the network <span aria-hidden="true">↗</span>
          </button>
          <div className="mt-7"><SocialLinks variant="hero" /></div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -right-5 -top-5 hidden h-28 w-28 rounded-full border border-[#D4AF37]/25 sm:block" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0B1224]/75 p-4 shadow-[0_30px_100px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">The service edit</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">What does your home need?</h2>
                <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm">Start with the appliance. Choose the right kind of help.</p>
              </div>
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 sm:flex">
                <Sparkles size={20} className="text-[#E5C65A]" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {serviceShortcuts.map((service, index) => (
                <button
                  key={service.label}
                  onClick={() => navigate('booking')}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition duration-300 hover:border-[#D4AF37]/45 hover:bg-white/[0.075] sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/[0.04]">
                    <service.icon size={21} className="text-[#E6CA67]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white sm:text-base">{service.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">{service.detail}</span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-[#E6CA67]" />
                  <span className="sr-only">Request {service.label.toLowerCase()}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/[0.10] to-transparent p-4 sm:p-5">
              <p className="text-xs font-semibold text-[#F0D989]">A clearer way to get started</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">Review listed pricing and applicable checkout charges before you confirm a request. Independent provider availability is not guaranteed.</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Discover · Connect · Get it done</span>
              <a href="tel:+916374068296" className="inline-flex items-center gap-2 text-xs font-semibold text-white transition hover:text-[#E6CA67]">
                <Phone size={13} /> Contact
              </a>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-white/45 lg:text-right">Service requests are subject to local provider availability.</p>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
    </section>
  );
}
