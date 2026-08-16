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
  { id: 'tutor-anita-menon', name: 'Anita Menon', subjectExpertise: ['English', 'Public Speaking'] },
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

function tutorById(id: string): TuitionClassTutor | undefined {
  return DEMO_TUTORS.find((t) => t.id === id);
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

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// ---------------------------------------------------------------------------
// Demo classes
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
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
    duration: durationMinutes(partial.startTime, partial.endTime),
    attendanceStatus: partial.attendanceStatus ?? 'not-marked',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const DEMO_CLASSES: TuitionClass[] = [
  // ---- Today ----
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Algebra Basics',
    classGrade: 'Class 8',
    board: 'CBSE',
    tutorId: 'tutor-priya-nair',
    tutorName: 'Priya Nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    date: isoDateOffset(0),
    startTime: '16:00',
    endTime: '17:00',
    mode: 'online',
    meetingProvider: 'google-meet',
    meetingUrl: 'https://meet.google.com/demo-maths-class',
    meetingId: 'demo-maths-class',
    status: 'scheduled',
  }),
  buildClass({
    courseId: 'science',
    courseName: 'Science (Physics, Chemistry, Biology)',
    subject: 'Introduction to Chemical Reactions',
    classGrade: 'Class 9',
    board: 'CBSE',
    tutorId: 'tutor-rahul-verma',
    tutorName: 'Rahul Verma',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    date: isoDateOffset(0),
    startTime: '18:00',
    endTime: '19:00',
    mode: 'online',
    meetingProvider: 'zoom',
    meetingUrl: 'https://zoom.us/j/demo-science-class',
    meetingId: 'demo-science-class',
    status: 'scheduled',
  }),

  // ---- Upcoming ----
  buildClass({
    courseId: 'spoken-english',
    courseName: 'Public Speaking — Foundation',
    subject: 'Conversational Practice',
    classGrade: 'Class 6',
    tutorId: 'tutor-anita-menon',
    tutorName: 'Anita Menon',
    studentIds: ['student-vihaan-joshi'],
    date: isoDateOffset(1),
    startTime: '17:00',
    endTime: '17:45',
    mode: 'online',
    meetingProvider: 'google-meet',
    meetingUrl: 'https://meet.google.com/demo-spoken-english',
    meetingId: 'demo-spoken-english',
    status: 'scheduled',
  }),
  buildClass({
    courseId: 'competitive-exam-preparation',
    courseName: 'Competitive Exam Preparation',
    subject: 'Mock Test Review',
    classGrade: 'Class 9',
    tutorId: 'tutor-suresh-kumar',
    tutorName: 'Suresh Kumar',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    date: isoDateOffset(3),
    startTime: '10:00',
    endTime: '11:30',
    mode: 'online',
    meetingProvider: null,
    status: 'scheduled',
  }),
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Geometry Fundamentals',
    classGrade: 'Class 8',
    board: 'CBSE',
    tutorId: 'tutor-priya-nair',
    tutorName: 'Priya Nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    date: isoDateOffset(6),
    startTime: '16:00',
    endTime: '17:00',
    mode: 'online',
    meetingProvider: 'google-meet',
    meetingUrl: 'https://meet.google.com/demo-maths-class-2',
    meetingId: 'demo-maths-class-2',
    status: 'scheduled',
  }),

  // ---- Completed (past) ----
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Fractions & Decimals',
    classGrade: 'Class 8',
    board: 'CBSE',
    tutorId: 'tutor-priya-nair',
    tutorName: 'Priya Nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    date: isoDateOffset(-2),
    startTime: '16:00',
    endTime: '17:00',
    mode: 'online',
    meetingProvider: 'google-meet',
    meetingUrl: 'https://meet.google.com/demo-maths-past',
    meetingId: 'demo-maths-past',
    status: 'completed',
    attendanceStatus: 'marked',
  }),
  buildClass({
    courseId: 'science',
    courseName: 'Science (Physics, Chemistry, Biology)',
    subject: 'States of Matter',
    classGrade: 'Class 9',
    board: 'CBSE',
    tutorId: 'tutor-rahul-verma',
    tutorName: 'Rahul Verma',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    date: isoDateOffset(-4),
    startTime: '18:00',
    endTime: '19:00',
    mode: 'online',
    meetingProvider: 'zoom',
    meetingUrl: 'https://zoom.us/j/demo-science-past',
    meetingId: 'demo-science-past',
    status: 'completed',
    attendanceStatus: 'marked',
  }),
  buildClass({
    courseId: 'abacus',
    courseName: 'Abacus — Beginner',
    subject: 'Bead Techniques — Level 2',
    classGrade: 'Class 6',
    tutorId: 'tutor-suresh-kumar',
    tutorName: 'Suresh Kumar',
    studentIds: ['student-vihaan-joshi'],
    date: isoDateOffset(-1),
    startTime: '15:00',
    endTime: '15:45',
    mode: 'online',
    meetingProvider: 'jitsi',
    meetingUrl: 'https://meet.jit.si/demo-abacus-past',
    meetingId: 'demo-abacus-past',
    status: 'completed',
    attendanceStatus: 'marked',
  }),

  // ---- Cancelled ----
  buildClass({
    courseId: 'other-online-tuition',
    courseName: 'Other Online Tuition',
    subject: 'Computer Basics',
    classGrade: 'Class 8',
    tutorId: 'tutor-rahul-verma',
    tutorName: 'Rahul Verma',
    studentIds: ['student-kabir-singh'],
    date: isoDateOffset(2),
    startTime: '17:00',
    endTime: '18:00',
    mode: 'online',
    meetingProvider: null,
    status: 'cancelled',
  }),
];

// ---------------------------------------------------------------------------
// Demo attendance records — only classes with attendanceStatus === 'marked'
// (i.e. completed classes) have records here.
// ---------------------------------------------------------------------------

function buildRosterFor(cls: TuitionClass, overrides: Record<string, TuitionAttendanceStatus> = {}): TuitionAttendanceRecord[] {
  return studentsById(cls.studentIds).map((student) => {
    const status = overrides[student.id] ?? 'present';
    return {
      id: nextId('attendance'),
      classId: cls.id,
      studentId: student.id,
      studentName: student.name,
      status,
      markedAt: cls.date,
    };
  });
}

const completedClasses = DEMO_CLASSES.filter((c) => c.status === 'completed');

const DEMO_ATTENDANCE_RECORDS: TuitionAttendanceRecord[] = [
  ...buildRosterFor(completedClasses[0], { 'student-diya-sharma': 'absent' }),
  ...buildRosterFor(completedClasses[1], { 'student-ananya-iyer': 'late' }),
  ...buildRosterFor(completedClasses[2]),
];

// ---------------------------------------------------------------------------
// Display status — derives the user-facing lifecycle state of a class from
// its stored status plus date/time, so "live" reflects the current moment
// even for demo data that was generated relative to "today".
// ---------------------------------------------------------------------------

export type TuitionClassDisplayStatus = 'live' | 'upcoming' | 'completed' | 'cancelled';

export function getDisplayStatus(cls: TuitionClass): TuitionClassDisplayStatus {
  if (cls.status === 'cancelled') return 'cancelled';
  if (cls.status === 'completed') return 'completed';

  const today = isoDateOffset(0);
  if (cls.date < today) return 'completed';
  if (cls.date > today) return 'upcoming';

  // cls.date === today — compare against current time.
  const startMinutes = toMinutes(cls.startTime);
  const endMinutes = toMinutes(cls.endTime);
  const current = nowMinutes();

  if (current >= startMinutes && current <= endMinutes) return 'live';
  if (current > endMinutes) return 'completed';
  return 'upcoming';
}

// ---------------------------------------------------------------------------
// Class queries
// ---------------------------------------------------------------------------

export function getAllClasses(): TuitionClass[] {
  return DEMO_CLASSES;
}

export function getClassesForStudent(studentId: string): TuitionClass[] {
  return DEMO_CLASSES.filter((c) => c.studentIds.includes(studentId));
}

export function getClassesForTutor(tutorId: string): TuitionClass[] {
  return DEMO_CLASSES.filter((c) => c.tutorId === tutorId);
}

export function getStudentsForClass(cls: TuitionClass): TuitionClassStudent[] {
  return studentsById(cls.studentIds);
}

/**
 * Splits a list of classes into Today / Upcoming / Completed buckets.
 * Cancelled classes are excluded — callers that need cancelled classes
 * should filter the source list separately with getDisplayStatus.
 */
export function splitClassesByTime(classes: TuitionClass[]): {
  today: TuitionClass[];
  upcoming: TuitionClass[];
  completed: TuitionClass[];
} {
  const today = isoDateOffset(0);

  return {
    today: classes.filter((c) => c.date === today && getDisplayStatus(c) !== 'cancelled'),
    upcoming: classes.filter((c) => c.date > today && getDisplayStatus(c) !== 'cancelled'),
    completed: classes.filter((c) => getDisplayStatus(c) === 'completed'),
  };
}

// ---------------------------------------------------------------------------
// Attendance queries
// ---------------------------------------------------------------------------

export function getAllAttendanceRecords(): TuitionAttendanceRecord[] {
  return DEMO_ATTENDANCE_RECORDS;
}

export function getAttendanceForClass(classId: string): TuitionAttendanceRecord[] {
  return DEMO_ATTENDANCE_RECORDS.filter((r) => r.classId === classId);
}

export function getAttendanceRecordsForStudent(studentId: string): TuitionAttendanceRecord[] {
  return DEMO_ATTENDANCE_RECORDS.filter((r) => r.studentId === studentId);
}

export function getStudentAttendanceSummary(studentId: string): TuitionStudentAttendanceSummary {
  const records = getAttendanceRecordsForStudent(studentId);

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const totalClasses = records.length;
  const attendancePercentage =
    totalClasses === 0 ? 0 : Math.round(((present + late) / totalClasses) * 100);

  return {
    studentId,
    totalClasses,
    present,
    absent,
    late,
    attendancePercentage,
  };
}

/**
 * Builds an editable attendance roster for a class: one record per
 * enrolled student, pre-filled from any existing attendance records for
 * that class, defaulting to "not-marked" for students with none yet.
 */
export function buildAttendanceRosterForClass(cls: TuitionClass): TuitionAttendanceRecord[] {
  const existing = getAttendanceForClass(cls.id);
  const existingByStudent = new Map(existing.map((r) => [r.studentId, r]));

  return studentsById(cls.studentIds).map((student) => {
    const record = existingByStudent.get(student.id);
    if (record) return record;

    return {
      id: nextId('attendance'),
      classId: cls.id,
      studentId: student.id,
      studentName: student.name,
      status: 'not-marked' as TuitionAttendanceStatus,
    };
  });
}