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
  Camera,
  LucideIcon,
} from 'lucide-react';

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
  ['cctv', Camera],
  ['camera', Camera],
  ['plumb', Wrench],
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

export function resolveServiceIcon(service: string | null | undefined): LucideIcon {
  if (!service) return Wrench;
  const name = ` ${service.toLowerCase()} `;
  const match = keywordMap.find(([keyword]) => name.includes(keyword));
  return match ? match[1] : Wrench;
}
