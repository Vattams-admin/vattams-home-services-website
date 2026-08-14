import { Radio, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { TuitionClassDisplayStatus } from '@/pages/tuition/tuitionClassData';

const STATUS_CONFIG: Record<
  TuitionClassDisplayStatus,
  { label: string; className: string; icon: typeof Radio }
> = {
  live: {
    label: 'Live Now',
    className: 'bg-red-50 text-red-600 border-red-200',
    icon: Radio,
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: CalendarClock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: XCircle,
  },
};

interface ClassStatusBadgeProps {
  status: TuitionClassDisplayStatus;
  className?: string;
}

export default function ClassStatusBadge({ status, className = '' }: ClassStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.className} ${className}`}
    >
      <Icon size={12} className={status === 'live' ? 'animate-pulse' : ''} />
      {config.label}
    </span>
  );
}