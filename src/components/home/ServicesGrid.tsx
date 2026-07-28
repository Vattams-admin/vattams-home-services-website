import { Wind, Sparkles, Thermometer, Zap, RotateCw, Flame, Droplets, Wrench, ArrowRight, Loader, LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase, ServiceCategory } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

const iconMap: Record<string, LucideIcon> = {
  wind: Wind,
  sparkles: Sparkles,
  thermometer: Thermometer,
  zap: Zap,
  'rotate-cw': RotateCw,
  flame: Flame,
  droplets: Droplets,
  wrench: Wrench,
  refrigerator: Droplets,
};

const colorPalette = [
  'from-blue-500 to-blue-700',
  'from-cyan-500 to-blue-600',
  'from-sky-400 to-blue-600',
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-blue-700',
  'from-blue-600 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-blue-400 to-cyan-500',
  'from-yellow-500 to-amber-600',
  'from-emerald-500 to-teal-600',
];

export default function ServicesGrid() {
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
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            What We Offer
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Our Expert Services
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base md:text-lg">
            Comprehensive home appliance repair and maintenance by certified technicians.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {services.map((svc, i) => {
              const Icon = iconMap[svc.icon ?? 'zap'] ?? Zap;
              const gradient = colorPalette[i % colorPalette.length];
              return (
                <button
                  key={svc.id}
                  onClick={() => navigate('booking')}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Gradient orb */}
                  <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{svc.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{svc.description}</p>
                  {svc.price_range && (
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {svc.price_range}
                    </span>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Book Now <ArrowRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <button
            onClick={() => navigate('services')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            View All Services <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
