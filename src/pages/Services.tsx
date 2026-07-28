import { useState, useEffect } from 'react';
import { Wind, Sparkles, Thermometer, Zap, RotateCw, Flame, Droplets, Wrench, ArrowRight, Loader, Check, LucideIcon } from 'lucide-react';
import { supabase, ServiceCategory } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const iconMap: Record<string, LucideIcon> = {
  wind: Wind, sparkles: Sparkles, thermometer: Thermometer, zap: Zap,
  'rotate-cw': RotateCw, flame: Flame, droplets: Droplets, wrench: Wrench, refrigerator: Droplets,
};

const colorPalette = [
  'from-blue-500 to-blue-700', 'from-cyan-500 to-blue-600', 'from-sky-400 to-blue-600',
  'from-teal-500 to-cyan-600', 'from-indigo-500 to-blue-700', 'from-blue-600 to-indigo-700',
  'from-amber-500 to-orange-600', 'from-blue-400 to-cyan-500', 'from-yellow-500 to-amber-600',
  'from-emerald-500 to-teal-600',
];

export default function Services() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('service_categories').select('*').order('created_at').then(({ data }) => {
      if (data) setServices(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Our Services
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Professional Home Services
          </h1>
          <p className="text-blue-200 max-w-xl mx-auto text-base md:text-lg">
            From AC installation to plumbing — we cover all your home appliance needs with certified technicians.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc, i) => {
                const Icon = iconMap[svc.icon ?? 'zap'] ?? Zap;
                const gradient = colorPalette[i % colorPalette.length];
                return (
                  <div
                    key={svc.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl p-6 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon size={26} className="text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{svc.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{svc.description}</p>
                    <div className="flex items-center justify-between">
                      {svc.price_range && (
                        <span className="bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                          {svc.price_range}
                        </span>
                      )}
                      <button
                        onClick={() => navigate('booking')}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        Book Now <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            What's Included in Every Service
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Free doorstep inspection',
              'Genuine spare parts with warranty',
              'Up to 30-day service warranty',
              'Transparent upfront pricing',
              'Background-verified technicians',
              'Real-time booking status updates',
              'Same-day service available',
              'Pay after service completion',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
