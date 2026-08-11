import {
  AirVent,
  Refrigerator,
  WashingMachine,
  Droplets,
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Fan,
  Flame,
  Sparkles,
  Wind,
  LucideIcon,
} from 'lucide-react';

interface ServiceIconProps {
  service: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

// Ordered list of [keyword, icon] pairs — first matching keyword wins.
// Keeps matching resilient to variations like "AC Repair" vs "Air Conditioner Service".
const keywordMap: [string, LucideIcon][] = [
  ['air condition', AirVent],
  ['ac repair', AirVent],
  ['ac service', AirVent],
  [' ac ', AirVent],
  ['split ac', AirVent],
  ['window ac', AirVent],
  ['refrigerator', Refrigerator],
  ['fridge', Refrigerator],
  ['washing machine', WashingMachine],
  ['laundry', WashingMachine],
  ['water heater', Flame],
  ['geyser', Flame],
  ['electric', Zap],
  ['wiring', Zap],
  ['plumb', Droplets],
  ['water', Droplets],
  ['leak', Droplets],
  ['carpentry', Hammer],
  ['furniture', Hammer],
  ['paint', Paintbrush],
  ['fan', Fan],
  ['cleaning', Sparkles],
  ['pest', Sparkles],
  ['cooling', Wind],
];

/**
 * Maps a service name/category string to a semantically appropriate Lucide
 * icon. Matching is case-insensitive and keyword-based so it tolerates
 * naming variations (e.g. "AC Repair", "Air Conditioner", "Split AC
 * Service" all resolve to AirVent). Falls back to Wrench for anything
 * unrecognized, and never throws on missing/empty input.
 *
 * Usage: <ServiceIcon service="AC Repair" />
 */
export default function ServiceIcon({ service, size = 22, strokeWidth = 2, className = '' }: ServiceIconProps) {
  const Icon = resolveServiceIcon(service);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}

export function resolveServiceIcon(service: string | null | undefined): LucideIcon {
  if (!service) return Wrench;
  const name = ` ${service.toLowerCase()} `;
  const match = keywordMap.find(([keyword]) => name.includes(keyword));
  return match ? match[1] : Wrench;
}