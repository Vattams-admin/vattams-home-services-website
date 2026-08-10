import { Briefcase, ArrowRight, TrendingUp, Clock, Wallet } from 'lucide-react';
import { useRouter } from '@/lib/router';

const perks = [
  { icon: TrendingUp, text: 'Steady stream of verified job leads' },
  { icon: Wallet, text: 'Transparent, on-time payouts' },
  { icon: Clock, text: 'Flexible working hours' },
];

export default function TechnicianCTA() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-20 bg-wine-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-wine-100 shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-3 p-8 md:p-12">
              <div className="inline-flex items-center gap-2 bg-wine-50 text-wine-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
                For Technicians
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-royal-950 mb-3">
                Are you a skilled technician?
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-6 max-w-md">
                Join VATTAMS and grow your service business with a steady flow of verified customers across your city.
              </p>
              <button
                onClick={() => navigate('join-technician')}
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-wine-600 hover:bg-wine-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-wine-900/10 transition-all duration-300"
              >
                <Briefcase size={17} />
                Join as a Technician
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="md:col-span-2 bg-wine-900 p-8 md:p-10 flex flex-col justify-center gap-5">
              {perks.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-wine-200" />
                    </div>
                    <span className="text-wine-50 text-sm font-medium">{p.text}</span>
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