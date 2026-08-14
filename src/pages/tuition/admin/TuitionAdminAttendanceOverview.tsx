import { useMemo, useState } from 'react';
import { Users, CalendarCheck, TrendingUp, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { getAllClasses, getAllAttendanceRecords, splitClassesByTime, DEMO_TUTORS } from '@/pages/tuition/tuitionClassData';
import { tuitionCourses } from '@/pages/tuition/tuitionCoursesData';

export default function TuitionAdminAttendanceOverview() {
  const [courseFilter, setCourseFilter] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const allClasses = useMemo(() => getAllClasses(), []);
  const allRecords = useMemo(() => getAllAttendanceRecords(), []);
  const { today } = useMemo(() => splitClassesByTime(allClasses), [allClasses]);

  const grades = useMemo(
    () => Array.from(new Set(allClasses.map((c) => c.classGrade))).sort(),
    [allClasses]
  );

  const filteredClassIds = useMemo(() => {
    return new Set(
      allClasses
        .filter((c) => !courseFilter || c.courseId === courseFilter)
        .filter((c) => !tutorFilter || c.tutorId === tutorFilter)
        .filter((c) => !gradeFilter || c.classGrade === gradeFilter)
        .filter((c) => !dateFilter || c.date === dateFilter)
        .map((c) => c.id)
    );
  }, [allClasses, courseFilter, tutorFilter, gradeFilter, dateFilter]);

  const filteredRecords = useMemo(
    () => allRecords.filter((r) => filteredClassIds.has(r.classId)),
    [allRecords, filteredClassIds]
  );

  const present = filteredRecords.filter((r) => r.status === 'present').length;
  const absent = filteredRecords.filter((r) => r.status === 'absent').length;
  const late = filteredRecords.filter((r) => r.status === 'late').length;
  const total = filteredRecords.length;
  const attendanceRate = total === 0 ? 0 : Math.round(((present + late) / total) * 100);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Classes" value={allClasses.length} icon={Users} tone="blue" />
        <StatCard label="Today's Classes" value={today.length} icon={CalendarCheck} tone="purple" />
        <StatCard label="Attendance Rate" value={`${attendanceRate}%`} icon={TrendingUp} tone="emerald" />
        <StatCard label="Present / Absent / Late" value={`${present} / ${absent} / ${late}`} icon={CheckCircle2} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">All Courses</option>
          {tuitionCourses.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select value={tutorFilter} onChange={(e) => setTutorFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">All Tutors</option>
          {DEMO_TUTORS.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
      </div>

      {filteredRecords.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
          No attendance records match these filters.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white">
          {filteredRecords.map((record) => {
            const cls = allClasses.find((c) => c.id === record.classId);
            return (
              <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{record.studentName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {cls?.subject} · {cls?.date}
                  </p>
                </div>
                <AttendanceIcon status={record.status} />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Demo data — will reflect live records once Supabase is connected.</p>
    </div>
  );
}

function AttendanceIcon({ status }: { status: 'present' | 'absent' | 'late' | 'not-marked' }) {
  if (status === 'present') return <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />;
  if (status === 'absent') return <XCircle size={16} className="text-red-500 shrink-0" />;
  if (status === 'late') return <Clock3 size={16} className="text-amber-500 shrink-0" />;
  return <span className="text-xs text-gray-400 shrink-0">Not marked</span>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone: 'blue' | 'purple' | 'emerald' | 'amber';
}) {
  const toneClasses: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${toneClasses[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}