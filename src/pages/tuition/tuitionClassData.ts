// Vattams Online Tuition — Phase 7
// Classes / Schedule / Attendance data-and-service layer.
//
// IMPORTANT: This is demo/static data only. There is no Supabase
// integration yet. Every exported "get" function below is a pure
// function over local demo data so it can later be swapped for a
// Supabase-backed implementation (see tuitionClassTypes.ts for the
// matching future table shapes) WITHOUT changing how the UI calls it.
//
// UI components should never reach into DEMO_* arrays directly — always
// go through the exported functions, so the future Supabase swap only
// touches this one file.

import {
  TuitionClass,
  TuitionClassMode,
  TuitionClassStudent,
  TuitionClassTutor,
  TuitionAttendanceRecord,
  TuitionAttendanceStatus,
  TuitionStudentAttendanceSummary,
} from './tuitionClassTypes';

// ---------------------------------------------------------------------------
// Demo identity — until student/tutor auth exists, these represent the
// "signed in" demo student and tutor whose classes the pages below show.
// ---------------------------------------------------------------------------

export const DEMO_CURRENT_STUDENT_ID = 'student-arjun-mehta';
export const DEMO_CURRENT_TUTOR_ID = 'tutor-priya-nair';

// ---------------------------------------------------------------------------
// Demo tutors & students
// ---------------------------------------------------------------------------

export const DEMO_TUTORS: TuitionClassTutor[] = [
  { id: 'tutor-priya-nair', name: 'Priya Nair', subjectExpertise: ['Mathematics', 'Science'] },
  { id: 'tutor-rahul-verma', name: 'Rahul Verma', subjectExpertise: ['Science', 'Computer Science'] },
  { id: 'tutor-anita-menon', name: 'Anita Menon', subjectExpertise: ['English', 'Spoken English'] },
  { id: 'tutor-suresh-kumar', name: 'Suresh Kumar', subjectExpertise: ['Social Science'] },
];

export const DEMO_STUDENTS: TuitionClassStudent[] = [
  { id: 'student-arjun-mehta', name: 'Arjun Mehta', grade: 'Class 8' },
  { id: 'student-diya-sharma', name: 'Diya Sharma', grade: 'Class 8' },
  { id: 'student-kabir-singh', name: 'Kabir Singh', grade: 'Class 8' },
  { id: 'student-ishita-rao', name: 'Ishita Rao', grade: 'Class 9' },
  { id: 'student-ananya-iyer', name: 'Ananya Iyer', grade: 'Class 9' },
  { id: 'student-vihaan-joshi', name: 'Vihaan Joshi', grade: 'Class 6' },
];

function studentsById(ids: string[]): TuitionClassStudent[] {
  return DEMO_STUDENTS.filter((s) => ids.includes(s.id));
}

// ---------------------------------------------------------------------------
// Date helpers — demo classes are generated relative to "today" so the
// Today / Upcoming / Completed split is always meaningful, instead of
// static dates that quietly go stale.
// ---------------------------------------------------------------------------

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function durationMinutes(startTime: string, endTime: string): number {
  return toMinutes(endTime) - toMinutes(startTime);
}

// ---------------------------------------------------------------------------
// Demo classes
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return ${prefix}-${idCounter};
}

function buildClass(
  partial: Omit<
    TuitionClass,
    'id' | 'duration' | 'attendanceStatus' | 'createdAt' | 'updatedAt'
  > & { attendanceStatus?: TuitionClass['attendanceStatus'] }
): TuitionClass {
  const now = new Date().toISOString();
  return {
    id: nextId('class'),
    duration: durationMinutes(partial.startTime, parti…
