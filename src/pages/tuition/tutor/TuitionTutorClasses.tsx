import { useMemo, useState } from 'react';
import { GraduationCap, ClipboardCheck, Settings, CheckCheck, Save } from 'lucide-react';
import {
  DEMO_CURRENT_TUTOR_ID,
  DEMO_TUTORS,
  getClassesForTutor,
  splitClassesByTime,
  buildAttendanceRosterForClass,
} from '../tuitionClassesData';
import { TuitionClass, TuitionAttendanceRecord, TuitionAttendanceStatus } from '../tuitionClassTypes';
import ClassCard from '@/components/tuition/classes/ClassCard';
import ClassDetail from '@/components/tuition/classes/ClassDetail';
import AttendanceTable from '@/components/tuition/classes/AttendanceTable';
import TuitionClassForm from '@/components/tuition/tutor/TuitionClassForm';

type TutorTab = 'classes' | 'attendance' | 'manage';

export default function TuitionTutorClasses() {
  const [tab, setTab] = useState<TutorTab>('classes');
  const [selectedClass, setSelectedClass] = useState<TuitionClass | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<TuitionClass | null>(null);
  const [roster, setRoster] = useState<TuitionAttendanceRecord[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);

  const tutor = DEMO_TUTORS.find((t) => t.id === DEMO_CURRENT_TUTOR_ID);
  const allClasses = useMemo(() => getClassesForTutor(DEMO_CURRENT_TUTOR_ID), []);
  const { today, upcoming, completed } = useMemo(() => splitClassesByTime(allClasses), [allClasses]);

  const openAttendance = (cls: TuitionClass) => {
    setAttendanceClass(cls);
    setRoster(buildAttendanceRosterForClass(cls));
    setSavedNotice(false);
    setTab('attendance');
  };

  const handleChangeStatus = (studentId: string, status: TuitionAttendanceStatus) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    setSavedNotice(false);
  };

  const markAllPresent = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, status: 'present' as TuitionAttendanceStatus })));
    setSavedNotice(false);
  };

  const saveAttendance = () => {
    setSavedNotice(true);
  };

  const tabs: { id: TutorTab; label: string; icon: typeof GraduationCap }[] = [
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'manage', label: 'Manage', icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="bg-gradient-to-r from-slate-900 via-purple-900 to-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide mb-1">
            Vattams Online Tuition
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">My Classes{tutor ? ` — ${tutor.name}` : ''}</h1>
          <p className="text-purple-100 text-sm mt-1">Demo tutor view · classes, attendance, and class management.</p>
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
                  active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
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
              onTakeAttendance={openAttendance}
            />
            <ClassGroup
              title="Upcoming Classes"
              classes={upcoming}
              onView={setSelectedClass}
              onTakeAttendance={openAttendance}
            />
            <ClassGroup
              title="Completed Classes"
              classes={completed}
              onView={setSelectedClass}
              onTakeAttendance={openAttendance}
            />
          </div>
        )}

        {tab === 'attendance' && (
          <div>
            {!attendanceClass ? (
              <div className="space-y-6">
                <p className="text-sm text-gray-500">
                  Select a class from the Classes tab and tap "Take Attendance" to mark students present, absent, or
                  late.
                </p>
                <ClassGroup
                  title="Today's Classes"
                  classes={today}
                  onView={setSelectedClass}
                  onTakeAttendance={openAttendance}
                />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{attendanceClass.subject}</h2>
                    <p className="text-sm text-gray-500">
                      {attendanceClass.date} · {attendanceClass.startTime}–{attendanceClass.endTime}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={markAllPresent}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <CheckCheck size={15} />
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={saveAttendance}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
                    >
                      <Save size={15} />
                      Save Attendance
                    </button>
                  </div>
                </div>

                <AttendanceTable records={roster} onChangeStatus={handleChangeStatus} />

                {savedNotice && (
                  <p className="text-sm text-emerald-600 font-medium">
                    Saved locally for this session — Supabase sync is not connected yet.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setAttendanceClass(null)}
                  className="text-sm text-purple-600 font-semibold hover:underline"
                >
                  ← Back to class list
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'manage' && <TuitionClassForm />}
      </section>

      {selectedClass && (
        <ClassDetail tuitionClass={selectedClass} viewerRole="tutor" onClose={() => setSelectedClass(null)} />
      )}
    </main>
  );
}

function ClassGroup({
  title,
  classes,
  onView,
  onTakeAttendance,
}: {
  title: string;
  classes: TuitionClass[];
  onView: (cls: TuitionClass) => void;
  onTakeAttendance: (cls: TuitionClass) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {classes.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
          Nothing here yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              tuitionClass={cls}
              viewerRole="tutor"
              onView={onView}
              onTakeAttendance={onTakeAttendance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
