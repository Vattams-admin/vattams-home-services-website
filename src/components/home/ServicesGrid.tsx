import { Wind, Sparkles, Thermometer, Zap, RotateCw, Flame, Droplets, Wrench, Refrigerator, Camera, ArrowRight, Loader, LucideIcon } from 'lucide-react';
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
  refrigerator: Refrigerator,
  camera: Camera,
};

const colorPalette = [
  'from-navy-800 to-navy-950',
  'from-gold-500 to-gold-700',
  'from-navy-700 to-navy-900',
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
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            What We Offer
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            Our Expert Services
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base md:text-lg">
            Comprehensive home appliance repair and maintenance by certified technicians.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-navy-700" size={32} />
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
                  className="group relative bg-white rounded-2xl border border-gold-100 shadow-sm hover:shadow-xl hover:border-gold-300 p-6 text-left transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Gradient orb */}
                  <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{svc.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{svc.description}</p>
                  {svc.price_range && (
                    <span className="inline-block bg-gold-50 text-gold-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {svc.price_range}
                    </span>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-gold-700 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Book Now <ArrowRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('services')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-navy-900 hover:bg-navy-950 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-navy-900/20 border border-gold-500/20"
          >
            View All Services <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}