import { MapPin, ArrowRight, Briefcase } from 'lucide-react';
import { useRouter } from '@/lib/router';

const activeCities = [
  { name: 'Chennai', slug: 'chennai' },
  { name: 'Coimbatore', slug: 'coimbatore' },
];

export default function CoverageArea() {
  const { navigate } = useRouter();

  return (
    <section className="py-16 md:py-20 bg-white" aria-labelledby="coverage-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            <MapPin size={14} /> Current Booking Areas
          </div>
          <h2 id="coverage-heading" className="font-display text-3xl font-bold text-navy-900 mb-3">Check Service Availability Near You</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            We currently have active technician coverage recorded in Chennai and Coimbatore. Appointment options still depend on your address, selected job type and technician schedule.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {activeCities.map((city) => (
            <button
              key={city.slug}
              type="button"
              onClick={() => navigate('city-landing', city.slug)}
              className="inline-flex items-center gap-2 bg-navy-50 hover:bg-gold-50 border border-navy-100 hover:border-gold-300 text-navy-800 rounded-full px-5 py-3 text-sm font-semibold transition-colors"
            >
              <MapPin size={14} className="text-gold-600" />
              {city.name}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" onClick={() => navigate('booking')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white px-6 py-3 font-bold transition-colors">
            Check My Address <ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => navigate('join-technician')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold-300 hover:bg-gold-50 text-navy-900 px-6 py-3 font-bold transition-colors">
            <Briefcase size={16} /> Help Expand Coverage
          </button>
        </div>
      </div>
    </section>
  );
}
