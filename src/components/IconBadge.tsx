import { LucideIcon } from 'lucide-react';

type Variant = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'gray' | 'white' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  icon: LucideIcon;
  size?: Size;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
  white: 'bg-white/10 text-white',
  gold: 'bg-gold-50 text-gold-700',
};

const sizeClasses: Record<Size, { box: string; icon: number }> = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 16 },
  md: { box: 'w-10 h-10 rounded-xl', icon: 20 },
  lg: { box: 'w-12 h-12 rounded-2xl', icon: 24 },
};

/**
 * Consistent icon container used across the site — service cards, trust
 * badges, feature lists, contact cards, etc. Keeps the VATTAMS blue/white
 * visual language in one place instead of duplicating the wrapper markup.
 *
 * Usage: <IconBadge icon={ShieldCheck} size="md" variant="blue" />
 */
export default function IconBadge({ icon: Icon, size = 'md', variant = 'blue', className = '' }: IconBadgeProps) {
  const { box, icon } = sizeClasses[size];
  return (
    <div className={`${box} ${variantClasses[variant]} flex items-center justify-center shrink-0 ${className}`}>
      <Icon size={icon} strokeWidth={2} aria-hidden="true" />
    </div>
  );
}