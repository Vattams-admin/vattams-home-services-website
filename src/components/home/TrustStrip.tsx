import { Users, ShieldCheck, MapPin, Star, LucideIcon } from 'lucide-react';
import IconBadge from '@/components/IconBadge';

const stats: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Users, value: '10,000+', label: 'Happy Customers' },
  { icon: ShieldCheck, value: '500+', label: 'Verified Technicians' },
  { icon: MapPin, value: '30+', label: 'Cities' },
  { icon: Star, value: '4.9', label: 'Customer Rating' },
];

export default function TrustStrip() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-6 flex flex-col items-center gap-2"
            >
              <IconBadge icon={s.icon} size="sm" variant="blue" />
              <div className="font-display text-2xl md:text-3xl font-bold text-royal-900">{s.value}</div>
              <div className="text-gray-500 text-xs md:text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}