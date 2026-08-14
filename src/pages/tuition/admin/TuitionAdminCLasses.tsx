import { useMemo, useState } from 'react';
import { getAllClasses, getDisplayStatus, splitClassesByTime, DEMO_TUTORS } from '@/pages/tuition/tuitionClassData';
import { tuitionCourses } from '@/pages/tuition/tuitionCoursesData';
import { TuitionClass } from '@/pages/tuition/tuitionClassTypes';
import ClassCard from '@/pages/tuition/classes/CLassCard';
import ClassDetail from '@/pages/tuition/classes/ClassDetail';

type AdminClassFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'cancelled';

export default function TuitionAdminClasses() {
  const [filter, setFilter] = useState<AdminClassFilter>('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [selectedClass, setSelectedClass] = useState<TuitionClass | null>(null);

  const allClasses = useMemo(() => getAllClasses(), []);
  const { today, upcoming, completed } = useMemo(() => splitClassesByTime(allClasses), [allClasses]);
  const cancelled = useMemo(() => allClasses.filter((c) => getDisplayStatus(c) === 'cancelled'), [allClasses]);

  const filtered = useMemo(() => {
    let base: TuitionClass[];
    switch (filter) {
      case 'today':
        base = today;
        break;
      case 'upcoming':
        base = upcoming;
        break;
      case 'completed':
        base = completed;
        break;
      case 'cancelled':
        base = cancelled;
        break;
      default:
        base = allClasses;
    }
    return base
      .filter((c) => !courseFilter || c.courseId === courseFilter)
      .filter((c) => !tutorFilter || c.tutorId === tutorFilter);
  }, [filter, allClasses, today, upcoming, completed, cancelled, courseFilter, tutorFilter]);

  const filters: { id: AdminClassFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Classes', count: allClasses.length },
    { id: 'today', label: "Today's Classes", count: today.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: completed.length },
    { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === f.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">All Courses</option>
          {tuitionCourses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={tutorFilter}
          onChange={(e) => setTutorFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">All Tutors</option>
          {DEMO_TUTORS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
          No classes match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((cls) => (
            <ClassCard key={cls.id} tuitionClass={cls} viewerRole="admin" onView={setSelectedClass} />
          ))}
        </div>
      )}

      {selectedClass && (
        <ClassDetail tuitionClass={selectedClass} viewerRole="admin" onClose={() => setSelectedClass(null)} />
      )}
    </div>
  );
}