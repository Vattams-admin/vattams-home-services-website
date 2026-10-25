import { Calendar, ArrowRight, Phone, Home, ShieldCheck, BadgeCheck, Clock3, Sparkles, Crown } from 'lucide-react';
import { useRouter } from '@/lib/router';
import SocialLinks from '@/components/SocialLinks';
import SafeImage from '@/components/SafeImage';

export default function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-[#050916] text-white">
      <div className="absolute inset-0">
        <SafeImage
          src="https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1920&q=85"
          alt="Elegant contemporary living room"
          className="h-full w-full object-cover object-center"
          fallbackIcon={Home}
          fallbackIconSize={72}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050916] via-[#050916]/90 to-[#050916]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050916] via-transparent to-[#050916]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_22%,rgba(212,175,55,0.20),transparent_34%)]" />
      </div>

      <div className="pointer-events-none absolute inset-5 rounded-[1.75rem] border border-[#D4AF37]/20 sm:inset-8 lg:inset-10" />
      <div className="pointer-events-none absolute right-[9%] top-[18%] hidden h-64 w-64 rounded-full border border-[#D4AF37]/15 lg:block" />
      <div className="pointer-events-none absolute right-[12%] top-[22%] hidden h-48 w-48 rounded-full border border-white/10 lg:block" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1.15fr_.85fr] lg:px-12 lg:py-28">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-black/25 px-4 py-2.5 backdrop-blur-md">
            <Crown size={14} className="text-[#E5C65A]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F3E7B5] sm:text-xs">VATTAMS · Home Service Marketplace</span>
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#D4AF37] sm:text-sm">
            Considered care. Clearer choices.
          </p>
          <h1 className="max-w-3xl font-display text-[2.65rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
            A more refined way to care for your
            <span className="mt-2 block bg-gradient-to-r from-[#F4DF8A] via-[#D4AF37] to-[#A87820] bg-clip-text pb-2 text-transparent">
              home essentials.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-200/90 sm:text-lg sm:leading-8">
            Discover AC, washing machine and refrigerator services, review available pricing, and send a structured request through one considered experience.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => navigate('booking')}
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#F3D56B] bg-gradient-to-r from-[#E2BF45] via-[#D4AF37] to-[#B58A21] px-7 py-4 text-sm font-bold text-[#101321] shadow-[0_12px_40px_rgba(212,175,55,.20)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <Calendar size={17} />
              Explore booking
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="tel:+916374068296"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/25 bg-white/[0.04] px-7 py-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#D4AF37]/70 hover:bg-white/[0.08]"
            >
              <Phone size={16} />
              Speak to VATTAMS
            </a>
          </div>

          <button
            onClick={() => navigate('join-technician')}
            className="mt-6 text-left text-xs font-medium text-[#E8D28A] underline decoration-[#D4AF37]/40 underline-offset-4 transition hover:text-white sm:text-sm"
          >
            Service professionals — explore network opportunities <span aria-hidden="true">↗</span>
          </button>

          <div className="mt-8">
            <SocialLinks variant="hero" />
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="ml-auto max-w-sm rounded-3xl border border-white/15 bg-[#090F20]/65 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                <Crown size={21} className="text-[#E5C65A]" />
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">The VATTAMS standard</span>
            </div>
            <h2 className="font-display text-2xl font-semibold leading-snug text-white">Every step, made clearer.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">A structured way to discover services, understand listed charges and stay informed about your request.</p>
            <div className="my-6 h-px bg-gradient-to-r from-[#D4AF37]/60 via-white/15 to-transparent" />
            <div className="space-y-4">
              {[
                { icon: ShieldCheck, label: 'Structured booking requests' },
                { icon: BadgeCheck, label: 'Price breakdown before confirmation' },
                { icon: Clock3, label: 'Service status updates' },
                { icon: Sparkles, label: 'Independent provider network' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon size={17} className="shrink-0 text-[#D4AF37]" />
                  <span className="text-sm text-slate-100">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Provider availability and appointment confirmation depend on your location and participating providers.</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
    </section>
  );
}
