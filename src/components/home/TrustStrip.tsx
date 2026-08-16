import { ShieldCheck, BadgeCheck, MapPin, HeartHandshake, LucideIcon } from 'lucide-react';
import IconBadge from '@/components/IconBadge';

const values: { icon: LucideIcon; label: string; desc: string }[] = [
  { icon: ShieldCheck, label: 'Verified Technicians', desc: 'Background-checked professionals' },
  { icon: BadgeCheck, label: 'Transparent Pricing', desc: 'No hidden charges' },
  { icon: MapPin, label: 'Multi-City Coverage', desc: 'Expanding across India' },
  { icon: HeartHandshake, label: 'Customer-First Service', desc: 'Support at every step' },
];

export default function TrustStrip() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="text-center mb-8">
          <h2 className="font-display text-xl md:text-2xl font-bold text-royal-900 mb-1.5">
            Trusted Home Service Network
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            Professional appliance services with verified service partners.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {values.map((v) => (
            <div
              key={v.label}
              className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-6 flex flex-col items-center gap-2"
            >
              <IconBadge icon={v.icon} size="sm" variant="blue" />
              <div className="font-display text-sm md:text-base font-bold text-royal-900">{v.label}</div>
              <div className="text-gray-500 text-xs md:text-sm font-medium">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}