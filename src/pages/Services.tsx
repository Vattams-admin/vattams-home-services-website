import { useState, useEffect } from 'react';
import { Wind, Refrigerator, WashingMachine, ArrowRight, Loader, Check, LucideIcon, Briefcase } from 'lucide-react';
import { supabase, ServiceCategory } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import JoinTechnicianButton from '@/components/JoinTechnicianButton';
import { useSEO } from '@/lib/seo';

const iconMap: Record<string, LucideIcon> = {
  wind: Wind, refrigerator: Refrigerator, 'washing-machine': WashingMachine,
};
const isFeaturedApplianceService = (name: string) => {
  const value = name.trim().toLowerCase();
  return /(^|\W)ac(\W|$)|air\s*condition/.test(value)
    || value.includes('washing machine')
    || value.includes('refrigerator')
    || value.includes('fridge');
};
const getApplianceIcon = (name: string, icon: string | null): LucideIcon => {
  const value = name.toLowerCase();
  if (value.includes('washing machine')) return WashingMachine;
  if (value.includes('refrigerator') || value.includes('fridge')) return Refrigerator;
  return iconMap[icon ?? 'wind'] ?? Wind;
};

const colorPalette = [
  'from-royal-700 to-royal-900', 'from-gold-500 to-gold-700', 'from-royal-600 to-royal-800',
];

export default function Services() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'VATTAMS Home Services | Premium AC, Washing Machine & Refrigerator Care',
    description:
      'Book premium AC, washing machine and refrigerator service with VATTAMS. Convenient doorstep booking and dedicated appliance-care support.',
    path: '/#services',
  });

  useEffect(() => {
  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('created_at');

      if (error) {
        console.error('Service Load Error:', error);
        setServices([]);
        return;
      }

      setServices((data || []).filter((service) => isFeaturedApplianceService(service.name)));
    } catch (err) {
      console.error('Unexpected Error:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  loadServices();
}, []);

  return (
    <div className="pt-20 md:pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-gold-300 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            Our Services
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Premium Appliance Services
          </h1>
          <p className="text-navy-100 max-w-xl mx-auto text-base md:text-lg">
            Specialist care for air conditioners, washing machines and refrigerators — with a booking experience designed around your home.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="animate-spin text-navy-700" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc, i) => {
                const Icon = getApplianceIcon(svc.name, svc.icon);
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
                        <span className="bg-gold-50 text-gold-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                          {svc.price_range}
                        </span>
                      )}
                      <button
                        onClick={() => navigate('booking')}
                        className="flex items-center gap-1.5 text-gold-700 hover:text-gold-800 text-sm font-semibold"
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
          <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-900 text-center mb-10">
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
              <div key={item} className="flex items-center gap-3 p-4 bg-gold-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-royal-800 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join as Technician CTA */}
      <section className="py-14 md:py-18 bg-navy-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Briefcase size={32} className="mx-auto mb-3" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Are You a Skilled Technician?</h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">Join VATTAMS and start receiving job requests near you. Professional onboarding, flexible working, secure payouts.</p>
          <button onClick={() => navigate('join-technician')} className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl shadow-lg transition-all hover:-translate-y-0.5">
            <Briefcase size={18} /> Join as a Technician
          </button>
        </div>
      </section>
    </div>
  );
}