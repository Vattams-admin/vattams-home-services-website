import { CheckCircle2, XCircle, Clock3, CircleDashed } from 'lucide-react';
import { TuitionAttendanceRecord, TuitionAttendanceStatus } from '@/pages/tuition/tuitionClassTypes';

const STATUS_META: Record<
  TuitionAttendanceStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  present: { label: 'Present', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  absent: { label: 'Absent', className: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
  late: { label: 'Late', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 },
  'not-marked': { label: 'Not Marked', className: 'bg-gray-100 text-gray-500 border-gray-200', icon: CircleDashed },
};

interface AttendanceTableProps {
  records: TuitionAttendanceRecord[];
  onChangeStatus?: (studentId: string, status: TuitionAttendanceStatus) => void;
}

export default function AttendanceTable({ records, onChangeStatus }: AttendanceTableProps) {
  const editable = Boolean(onChangeStatus);

  if (records.length === 0) {
    return <p className="text-sm text-gray-400">No students to display.</p>;
  }

  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white">
      {records.map((record) => {
        const meta = STATUS_META[record.status];
        const Icon = meta.icon;

        return (
          <div key={record.studentId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{record.studentName}</p>
              {record.notes && <p className="text-xs text-gray-400 truncate">{record.notes}</p>}
            </div>

            {editable ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {(['present', 'absent', 'late'] as TuitionAttendanceStatus[]).map((status) => {
                  const optionMeta = STATUS_META[status];
                  const OptionIcon = optionMeta.icon;
                  const active = record.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onChangeStatus?.(record.studentId, status)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        active ? optionMeta.className : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <OptionIcon size={12} />
                      {optionMeta.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span
                className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ${meta.className}'}
              >
                <Icon size={12} />
                {meta.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
