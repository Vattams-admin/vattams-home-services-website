import { GraduationCap, Users, Monitor, ArrowRight } from 'lucide-react';
import { TuitionCourse } from '@/pages/tuition/tuitionCoursesData';

interface TuitionCourseCardProps {
  course: TuitionCourse;
  onView: (slug: string) => void;
}

export default function TuitionCourseCard({ course, onView }: TuitionCourseCardProps) {
  return (
    <div className="flex flex-col p-6 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all bg-white">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50 text-purple-600 mb-4">
        <GraduationCap size={22} />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {course.name}
      </h3>

      <p className="text-sm text-gray-600 mb-4 flex-1">
        {course.shortDescription}
      </p>

      <div className="flex flex-col gap-1.5 mb-5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-gray-400" />
          {course.suitableFor}
        </div>
        <div className="flex items-center gap-1.5">
          <Monitor size={13} className="text-gray-400" />
          {course.mode}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onView(course.slug)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
      >
        View Course
        <ArrowRight size={15} />
      </button>
    </div>
  );
}