import { resolveServiceIcon } from '@/lib/serviceIconResolver';

interface ServiceIconProps {
  service: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

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

