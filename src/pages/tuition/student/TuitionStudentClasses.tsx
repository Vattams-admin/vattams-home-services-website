import { useMemo, useState } from 'react';
import {
  GraduationCap,
  CalendarDays,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
} from 'lucide-react';

import {
  DEMO_CURRENT_STUDENT_ID,
  DEMO_STUDENTS,
  getClassesForStudent,
  splitClassesByTime,
  getStudentAttendanceSummary,
  getAttendanceRecordsForStudent,
} from '../tuitionClassesData';

import {
  TuitionClass,
  TuitionAttendanceStatus,
} from '../tuitionClassTypes';

import ClassCard from '@/components/tuition/classes/ClassCard';
import ClassDetail from '@/components/tuition/classes/ClassDetail';

type StudentTab = 'classes' | 'schedule' | 'attendance';
type ScheduleFilter = 'today' | 'tomorrow' | 'week';

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function TuitionStudentClasses() {
  const [tab, setTab] = useState<StudentTab>('classes');

  const [scheduleFilter, setScheduleFilter] =
    useState<ScheduleFilter>('today');

  const [selectedClass, setSelectedClass] =
    useState<TuitionClass | null>(null);

  const student = DEMO_STUDENTS.find(
    (s) => s.id === DEMO_CURRENT_STUDENT_ID
  );

  const allClasses = useMemo(
    () => getClassesForStudent(DEMO_CURRENT_STUDENT_ID),
    []
  );

  const {
    today,
    upcoming,
    completed,
  } = useMemo(
    () => splitClassesByTime(allClasses),
    [allClasses]
  );

  const summary = useMemo(
    () =>
      getStudentAttendanceSummary(
        DEMO_CURRENT_STUDENT_ID
      ),
    []
  );

  const attendanceRecords = useMemo(
    () =>
      getAttendanceRecordsForStudent(
        DEMO_CURRENT_STUDENT_ID
      ),
    []
  );

  const scheduleClasses = useMemo(() => {
    if (scheduleFilter === 'today') {
      return allClasses.filter(
        (c) => c.date === isoDateOffset(0)
      );
    }

    if (scheduleFilter === 'tomorrow') {
      return allClasses.filter(
        (c) => c.date === isoDateOffset(1)
      );
    }

    const weekStart = isoDateOffset(0);
    const weekEnd = isoDateOffset(6);

    return allClasses
      .filter(
        (c) =>
          c.date >= weekStart &&
          c.date <= weekEnd
      )
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date)
      );
  }, [allClasses, scheduleFilter]);

  const handleJoin = (cls: TuitionClass) => {
    if (cls.meetingUrl) {
      window.open(
        cls.meetingUrl,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const tabs: {
    id: StudentTab;
    label: string;
    icon: typeof CalendarDays;
  }[] = [
    {
      id: 'classes',
      label: 'Classes',
      icon: GraduationCap,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: CalendarDays,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: ClipboardCheck,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">

          <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide mb-1">
            Vattams Online Tuition
          </p>

          <h1 className="text-2xl md:text-3xl font-bold">
            My Classes
            {student
              ? ` — ${student.name}`
              : ''}
          </h1>

          <p className="text-purple-100 text-sm mt-1">
            Demo student view · classes, schedule, and attendance.
          </p>

        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 -mt-5">

        <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm w-fit">

          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}

        </div>

      </div>

      <section className="max-w-5xl mx-auto px-6 py-8">

        {tab === 'classes' && (
          <div className="space-y-10">

            <ClassGroup
              title="Today's Classes"
              classes={today}
              onView={setSelectedClass}
              onJoin={handleJoin}
            />

            <ClassGroup
              title="Upcoming Classes"
              classes={upcoming}
              onView={setSelectedClass}
              onJoin={handleJoin}
            />

            <ClassGroup
              title="Completed Classes"
              classes={completed}
              onView={setSelectedClass}
              onJoin={handleJoin}
            />

          </div>
        )}

        {tab === 'schedule' && (
          <div>

            <div className="flex gap-2 mb-6">

              {(
                [
                  'today',
                  'tomorrow',
                  'week',
                ] as ScheduleFilter[]
              ).map((f) => (

                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setScheduleFilter(f)
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    scheduleFilter === f
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f === 'today'
                    ? 'Today'
                    : f === 'tomorrow'
                      ? 'Tomorrow'
                      : 'This Week'}
                </button>

              ))}

            </div>

            {scheduleClasses.length === 0 ? (

              <EmptyState
                message="No classes scheduled for this period."
              />

            ) : (

              <div className="space-y-3">

                {scheduleClasses.map((cls) => (

                  <div
                    key={cls.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-xl border border-gray-200 bg-white"
                  >

                    <div>

                      <p className="font-semibold text-gray-900">
                        {cls.subject}
                      </p>

                      <p className="text-xs text-gray-500">
                        {cls.courseName} · {cls.tutorName}
                      </p>

                    </div>

                    <div className="text-sm text-gray-600">
                      {cls.date} · {cls.startTime}–{cls.endTime}
                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>
        )}

        {tab === 'attendance' && (

          <div className="space-y-8">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <StatCard
                label="Attendance %"
                value={`${summary.attendancePercentage}%`}
                icon={TrendingUp}
                tone="purple"
              />

              <StatCard
                label="Present"
                value={summary.present}
                icon={CheckCircle2}
                tone="emerald"
              />

              <StatCard
                label="Absent"
                value={summary.absent}
                icon={XCircle}
                tone="red"
              />

              <StatCard
                label="Late"
                value={summary.late}
                icon={Clock3}
                tone="amber"
              />

            </div>

            <div>

              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Per-Class Attendance
              </h2>

              {attendanceRecords.length === 0 ? (

                <EmptyState
                  message="No attendance records yet."
                />

              ) : (

                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white">

                  {attendanceRecords.map((record) => {

                    const cls =
                      completed.find(
                        (c) =>
                          c.id === record.classId
                      ) ??
                      allClasses.find(
                        (c) =>
                          c.id === record.classId
                      );

                    return (

                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >

                        <div className="min-w-0">

                          <p className="text-sm font-medium text-gray-900 truncate">
                            {cls?.subject ?? 'Class'}
                          </p>

                          <p className="text-xs text-gray-400">
                            {cls?.date ??
                              record.markedAt}
                          </p>

                        </div>

                        <AttendanceStatusPill
                          status={record.status}
                        />

                      </div>

                    );
                  })}

                </div>

              )}

            </div>

            <p className="text-xs text-gray-400">
              Demo data — attendance will sync live once Supabase is connected.
            </p>

          </div>

        )}

      </section>

      {selectedClass && (

        <ClassDetail
          tuitionClass={selectedClass}
          viewerRole="student"
          onClose={() =>
            setSelectedClass(null)
          }
          onJoin={handleJoin}
        />

      )}

    </main>
  );
}

function ClassGroup({
  title,
  classes,
  onView,
  onJoin,
}: {
  title: string;
  classes: TuitionClass[];
  onView: (cls: TuitionClass) => void;
  onJoin: (cls: TuitionClass) => void;
}) {

  return (

    <div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {title}
      </h2>

      {classes.length === 0 ? (

        <EmptyState
          message="Nothing here yet."
        />

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {classes.map((cls) => (

            <ClassCard
              key={cls.id}
              tuitionClass={cls}
              viewerRole="student"
              onView={onView}
              onJoin={onJoin}
            />

          ))}

        </div>

      )}

    </div>

  );
}

const ATTENDANCE_PILL_CLASSES: Record<
  TuitionAttendanceStatus,
  string
> = {

  present:
    'bg-emerald-50 text-emerald-700 border-emerald-200',

  absent:
    'bg-red-50 text-red-600 border-red-200',

  late:
    'bg-amber-50 text-amber-700 border-amber-200',

  'not-marked':
    'bg-gray-100 text-gray-500 border-gray-200',

};

function AttendanceStatusPill({
  status,
}: {
  status: TuitionAttendanceStatus;
}) {

  const label =
    status === 'not-marked'
      ? 'Not Marked'
      : status.charAt(0).toUpperCase() +
        status.slice(1);

  return (

    <span
      className={`px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ${
        ATTENDANCE_PILL_CLASSES[status]
      }`}
    >
      {label}
    </span>

  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {

  return (

    <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
      {message}
    </div>

  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  tone:
    | 'purple'
    | 'emerald'
    | 'red'
    | 'amber';
}) {

  const toneClasses: Record<
    typeof tone,
    string
  > = {

    purple:
      'bg-purple-50 text-purple-600',

    emerald:
      'bg-emerald-50 text-emerald-600',

    red:
      'bg-red-50 text-red-600',

    amber:
      'bg-amber-50 text-amber-600',

  };

  return (

    <div className="p-5 rounded-2xl border border-gray-200 bg-white">

      <div
        className={`flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${
          toneClasses[tone]
        }`}
      >
        <Icon size={18} />
      </div>

      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>

      <div className="text-sm text-gray-500">
        {label}
      </div>

    </div>

  );
}