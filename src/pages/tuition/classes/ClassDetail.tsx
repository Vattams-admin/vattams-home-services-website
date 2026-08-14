import { X, BookOpen, Users, Monitor, Video, GraduationCap } from 'lucide-react';
import { TuitionClass } from '@/pages/tuition/tuitionClassTypes';
import { getDisplayStatus, getStudentsForClass, getAttendanceForClass } from '@/pages/tuition/tuitionClassData';
import ClassStatusBadge from './CLassStatusBadge';
import AttendanceTable from './AttendanceTable';

interface ClassDetailProps {
  tuitionClass: TuitionClass;
  viewerRole: 'student' | 'tutor' | 'admin';
  onClose: () => void;
  onJoin?: (cls: TuitionClass) => void;
}

export default function ClassDetail({ tuitionClass: cls, viewerRole, onClose, onJoin }: ClassDetailProps) {
  const displayStatus = getDisplayStatus(cls);
  const students = getStudentsForClass(cls);
  const attendance = getAttendanceForClass(cls.id);
  const canJoin = (displayStatus === 'live' || displayStatus === 'upcoming') && !!cls.meetingUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-purple-600" />
            <h2 className="font-bold text-gray-900">Class Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{cls.subject}</h3>
              <ClassStatusBadge status={displayStatus} />
            </div>
            <p className="text-sm text-gray-500">{cls.courseName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-gray-400 text-xs mb-0.5">Date</p>
              <p className="font-medium text-gray-900">{cls.date}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-gray-400 text-xs mb-0.5">Time</p>
              <p className="font-medium text-gray-900">
                {cls.startTime} – {cls.endTime}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-gray-400 text-xs mb-0.5">Duration</p>
              <p className="font-medium text-gray-900">{cls.duration} min</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-gray-400 text-xs mb-0.5">Mode</p>
              <p className="font-medium text-gray-900 capitalize flex items-center gap-1.5">
                <Monitor size={13} className="text-gray-400" />
                {cls.mode}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 text-sm">
            <p className="text-gray-400 text-xs mb-0.5">Tutor</p>
            <p className="font-medium text-gray-900">{cls.tutorName}</p>
          </div>

          {(viewerRole === 'tutor' || viewerRole === 'admin') && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={14} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-900">
                  Students ({students.length})
                </p>
              </div>
              <ul className="space-y-1.5">
                {students.map((s) => (
                  <li key={s.id} className="text-sm text-gray-600 flex items-center justify-between">
                    <span>{s.name}</span>
                    {s.grade && <span className="text-xs text-gray-400">{s.grade}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Meeting Status</p>
            </div>
            {cls.meetingUrl ? (
              <p className="text-sm text-gray-600">
                A {cls.meetingProvider?.replace('-', ' ') ?? 'meeting'} link is ready for this class.
              </p>
            ) : (
              <p className="text-sm text-gray-400">Join link will be available before class.</p>
            )}
          </div>

          {attendance.length > 0 && displayStatus === 'completed' && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Attendance</p>
              <AttendanceTable records={attendance} />
            </div>
          )}

          {viewerRole === 'student' && (
            <button
              type="button"
              disabled={!canJoin}
              onClick={() => canJoin && onJoin?.(cls)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
            >
              <Video size={16} />
              {cls.meetingUrl ? 'Join Class' : 'Join link pending'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
