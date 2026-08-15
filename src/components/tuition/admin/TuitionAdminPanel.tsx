import { useEffect, useState } from 'react';
import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  FlaskConical,
  ClipboardList,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LucideIcon,
} from 'lucide-react';
import TuitionAdminClasses from '@/pages/tuition/admin/TuitionAdminCLasses';
import TuitionAdminAttendanceOverview from '@/pages/tuition/admin/TuitionAdminAttendanceOverview';
import TuitionAdminMaterials from '@/components/tuition/admin/TuitionAdminMaterials';
import TuitionAdminStudents from '@/components/tuition/admin/TuitionAdminStudents';
import { supabase } from '@/lib/supabase';

type TuitionAdminTab = 'overview' | 'students' | 'classes' | 'attendance' | 'materials';

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
};

type SectionCard = {
  label: string;
  description: string;
  icon: LucideIcon;
};

const sections: SectionCard[] = [
  {
    label: 'Students',
    description: 'View and manage tuition student records.',
    icon: Users,
  },
  {
    label: 'Tutors',
    description: 'View and manage tutor profiles and assignments.',
    icon: UserCheck,
  },
  {
    label: 'Courses',
    description: 'Manage the list of subjects and course offerings.',
    icon: BookOpen,
  },
  {
    label: 'Trial Classes',
    description: 'Track free trial class requests and scheduling.',
    icon: FlaskConical,
  },
  {
    label: 'Enrollments',
    description: 'Manage active and past student enrollments.',
    icon: ClipboardList,
  },
];

export default function TuitionAdminPanel() {
  const [tab, setTab] = useState<TuitionAdminTab>('overview');
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const adminId = sessionStorage.getItem('vattams_admin');
    if (!adminId) return;

    let mounted = true;

    supabase
      .rpc('admin_list_tuition_students', { p_admin_id: adminId, p_status: null })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('[TuitionAdminPanel] admin_list_tuition_students error:', error);
          return;
        }
        setTotalStudents((data ?? []).length);
      });

    return () => {
      mounted = false;
    };
  }, [tab]);

  const stats: StatCard[] = [
    { label: 'Total Students', value: totalStudents, icon: Users },
    { label: 'Total Tutors', value: 0, icon: UserCheck },
    { label: 'Active Courses', value: 0, icon: BookOpen },
    { label: 'Trial Classes', value: 0, icon: FlaskConical },
    { label: 'Active Enrollments', value: 0, icon: ClipboardList },
  ];

  const tabs: { id: TuitionAdminTab; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'classes', label: 'Classes', icon: CalendarDays },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'materials', label: 'Materials', icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
          <GraduationCap size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Online Tuition</h2>
          <p className="text-sm text-gray-500">
            Vattams Online Tuition administration
          </p>
        </div>
      </div>

      {/* ===================== SUB-TABS ===================== */}
      <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-200 w-fit mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <>
          {/* ===================== STAT CARDS ===================== */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-5 rounded-2xl border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 mb-3">
                    <Icon size={18} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* ===================== SECTIONS ===================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isStudents = section.label === 'Students';
              return (
                <button
                  key={section.label}
                  type="button"
                  disabled={!isStudents}
                  onClick={() => {
                    if (isStudents) setTab('students');
                  }}
                  className={`text-left p-6 rounded-2xl border border-gray-200 bg-white ${
                    isStudents ? 'hover:border-purple-200 hover:shadow-sm cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-700">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {section.label}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500">{section.description}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {isStudents ? `${totalStudents} registration${totalStudents === 1 ? '' : 's'}` : 'Coming soon — no data yet.'}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'students' && <TuitionAdminStudents />}
      {tab === 'classes' && <TuitionAdminClasses />}
      {tab === 'attendance' && <TuitionAdminAttendanceOverview />}
      {tab === 'materials' && <TuitionAdminMaterials />}
    </div>
  );
}