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
    <section className="bg-white border-y border-gold-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-9">
          <div>
            <div className="text-gold-700 text-xs font-bold uppercase tracking-[0.2em] mb-3">The VATTAMS Standard</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-900">
              A service network built on trust.
            </h2>
          </div>
          <p className="text-gray-500 text-sm md:text-base max-w-xl lg:text-right">
            Professional appliance services with verified service partners and a structured customer experience.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {values.map((v) => (
            <div
              key={v.label}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-6 md:px-5 flex flex-col gap-3 hover:border-gold-200 hover:shadow-lg transition-all duration-300"
            >
              <IconBadge icon={v.icon} size="sm" variant="gold" />
              <div className="font-display text-sm md:text-base font-bold text-navy-900">{v.label}</div>
              <div className="text-gray-500 text-xs md:text-sm leading-relaxed">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
