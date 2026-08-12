import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  FlaskConical,
  ClipboardList,
  LucideIcon,
} from 'lucide-react';

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
};

const stats: StatCard[] = [
  { label: 'Total Students', value: 0, icon: Users },
  { label: 'Total Tutors', value: 0, icon: UserCheck },
  { label: 'Active Courses', value: 0, icon: BookOpen },
  { label: 'Trial Classes', value: 0, icon: FlaskConical },
  { label: 'Active Enrollments', value: 0, icon: ClipboardList },
];

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
          return (
            <div
              key={section.label}
              className="p-6 rounded-2xl border border-gray-200 bg-white"
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
                Coming soon — no data yet.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
