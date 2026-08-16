import { MapPin } from 'lucide-react';

const cities = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Namakkal',
  'Thanjavur', 'Dindigul', 'Tiruppur', 'Hosur', 'Nagercoil',
  'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Puducherry', 'Villupuram',
];

export default function CoverageArea() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gold-50 text-gold-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-4 tracking-wide uppercase">
            <MapPin size={14} /> Coverage
          </div>
          <h2 className="font-display text-3xl font-bold text-navy-900 mb-3">We Serve Across India</h2>
          <p className="text-gray-500 max-w-md mx-auto">Serving multiple cities across India and growing.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((city) => (
            <div
              key={city}
              className="flex items-center gap-1.5 bg-navy-50 hover:bg-gold-50 border border-navy-100 hover:border-gold-300 text-navy-800 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-default"
            >
              <MapPin size={12} className="text-gold-600" />
              {city}
            </div>
          ))}
          <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 rounded-full px-4 py-2 text-sm font-medium">
            + More cities
          </div>
        </div>
      </div>
    </section>
  );
}