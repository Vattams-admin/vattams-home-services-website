import { useState } from 'react';
import { PlusCircle, Info } from 'lucide-react';
import { tuitionCourses } from '@/pages/tuition/tuitionCoursesData';
import { TuitionClassMode, TuitionMeetingProvider } from '@/pages/tuition/tuitionClassTypes';

const MEETING_PROVIDERS: { value: TuitionMeetingProvider; label: string }[] = [
  { value: null, label: 'Not decided yet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'jitsi', label: 'Jitsi' },
  { value: 'other', label: 'Other' },
];

export default function TuitionClassForm() {
  const [courseId, setCourseId] = useState('');
  const [subject, setSubject] = useState('');
  const [classGrade, setClassGrade] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mode, setMode] = useState<TuitionClassMode>('online');
  const [meetingProvider, setMeetingProvider] = useState<string>('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <PlusCircle size={18} className="text-purple-600" />
        <h2 className="text-lg font-bold text-gray-900">Create / Edit Class</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Set up a class, then reschedule or cancel it later from here.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select a course</option>
            {tuitionCourses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class / Grade</label>
            <input
              type="text"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              placeholder="e.g. Class 8"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as TuitionClassMode)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting Provider</label>
            <select
              value={meetingProvider}
              onChange={(e) => setMeetingProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {MEETING_PROVIDERS.map((p) => (
                <option key={p.label} value={p.value ?? ''}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting Link (optional)</label>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Leave blank if not available yet"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            Save Class
          </button>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Reschedule
          </button>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Cancel Class
          </button>
        </div>
      </form>

      {submitted && (
        <div className="flex items-start gap-2 mt-5 p-4 rounded-xl bg-blue-50 text-blue-700 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            This form isn't connected to a backend yet, so nothing was actually saved. Once Supabase is
            connected, this will create a real class.
          </span>
        </div>
      )}
    </div>
  );
}
