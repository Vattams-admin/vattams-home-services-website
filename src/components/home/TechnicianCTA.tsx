import { Briefcase, ArrowRight, TrendingUp, Clock, Wallet, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/lib/router';

const perks = [
  { icon: TrendingUp, text: 'Steady stream of verified service leads' },
  { icon: Wallet, text: 'Transparent, on-time payouts' },
  { icon: Clock, text: 'Flexible working hours' },
  { icon: ShieldCheck, text: 'Professional network & support' },
];

export default function TechnicianCTA() {
  const { navigate } = useRouter();

  return (
    <section className="py-20 md:py-28 bg-ivory relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.10),transparent_50%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-navy-950 rounded-[2rem] border border-gold-400/20 shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-5">
            <div className="lg:col-span-3 p-8 md:p-12 lg:p-14">
              <div className="inline-flex items-center gap-2 bg-gold-400/10 text-gold-300 border border-gold-400/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] mb-6">
                Technician Network
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Build your service business with VATTAMS.
              </h2>
              <p className="text-navy-100/75 text-base md:text-lg leading-relaxed mb-7 max-w-xl">
                Join a professional home-service network built around verified customer demand, transparent payouts, and dependable operational support.
              </p>
              <button
                onClick={() => navigate('join-technician')}
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold text-sm rounded-xl shadow-lg shadow-gold-900/20 transition-all duration-300"
              >
                <Briefcase size={17} />
                Join the Network
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="mt-4 text-xs text-navy-100/45">
                Professional onboarding • ₹49 registration fee
              </p>
            </div>

            <div className="lg:col-span-2 bg-white/[0.04] border-t lg:border-t-0 lg:border-l border-gold-400/15 p-8 md:p-10 flex flex-col justify-center gap-5">
              {perks.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.text} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-gold-300" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{p.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
