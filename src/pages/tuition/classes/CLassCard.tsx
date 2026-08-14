import { CalendarDays, Clock3, User, Video, ClipboardCheck } from 'lucide-react';
import { TuitionClass } from '@/pages/tuition/tuitionClassTypes';
import { getDisplayStatus } from '@/pages/tuition/tuitionClassData';
import ClassStatusBadge from './CLassStatusBadge';

interface ClassCardProps {
  tuitionClass: TuitionClass;
  viewerRole: 'student' | 'tutor' | 'admin';
  onView: (cls: TuitionClass) => void;
  onTakeAttendance?: (cls: TuitionClass) => void;
  onJoin?: (cls: TuitionClass) => void;
}

export default function ClassCard({
  tuitionClass: cls,
  viewerRole,
  onView,
  onTakeAttendance,
  onJoin,
}: ClassCardProps) {
  const displayStatus = getDisplayStatus(cls);
  const canJoin = (displayStatus === 'live' || displayStatus === 'upcoming') && !!cls.meetingUrl;
  const canTakeAttendance =
    viewerRole === 'tutor' && (displayStatus === 'live' || displayStatus === 'completed');

  return (
    <div className="p-5 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{cls.subject}</h3>
          <p className="text-xs text-gray-500 truncate">{cls.courseName}</p>
        </div>
        <ClassStatusBadge status={displayStatus} />
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={14} className="text-gray-400 shrink-0" />
          <span>{cls.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock3 size={14} className="text-gray-400 shrink-0" />
          <span>
            {cls.startTime} – {cls.endTime}
          </span>
        </div>
        {viewerRole !== 'tutor' && (
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{cls.tutorName}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(cls)}
          className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>

        {viewerRole === 'student' && (
          <button
            type="button"
            disabled={!canJoin}
            onClick={() => canJoin && onJoin?.(cls)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
          >
            <Video size={13} />
            {cls.meetingUrl ? 'Join Class' : 'Join link pending'}
          </button>
        )}

        {viewerRole === 'tutor' && onTakeAttendance && (
          <button
            type="button"
            disabled={!canTakeAttendance}
            onClick={() => canTakeAttendance && onTakeAttendance(cls)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
          >
            <ClipboardCheck size={13} />
            Take Attendance
          </button>
        )}
      </div>
    </div>
  );
}