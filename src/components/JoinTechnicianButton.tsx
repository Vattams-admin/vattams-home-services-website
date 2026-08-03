import { Briefcase } from 'lucide-react';
import { useRouter, type Page } from '@/lib/router';

interface Props {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const variantClasses: Record<string, string> = {
  solid: 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200',
  outline: 'border-2 border-orange-500 text-orange-600 hover:bg-orange-50 bg-white',
  ghost: 'text-orange-600 hover:bg-orange-50',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2.5',
};

export default function JoinTechnicianButton({ variant = 'solid', size = 'md', className = '', label = 'Join as a Technician' }: Props) {
  const { navigate } = useRouter();
  return (
    <button
      onClick={() => navigate('join-technician' as Page)}
      className={`flex items-center font-bold rounded-xl transition-all duration-300 hover:scale-105 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <Briefcase size={size === 'lg' ? 20 : size === 'sm' ? 14 : 16} />
      {label}
    </button>
  );
}
