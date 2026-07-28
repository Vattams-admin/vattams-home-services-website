import { MapPin } from 'lucide-react';

const cities = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Namakkal',
  'Thanjavur', 'Dindigul', 'Tiruppur', 'Hosur', 'Nagercoil',
  'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Puducherry', 'Villupuram',
];

export default function CoverageArea() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <MapPin size={14} /> Coverage
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">We Serve Across Tamil Nadu</h2>
          <p className="text-gray-500 max-w-md mx-auto">Available in 30+ cities and growing.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((city) => (
            <div
              key={city}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-800 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-default"
            >
              <MapPin size={12} className="text-blue-500" />
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
