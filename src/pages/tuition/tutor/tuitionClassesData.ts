// Vattams Online Tuition — Phase 7
// Classes / Schedule / Attendance data-and-service layer.
//
// IMPORTANT: This is demo/static data only. There is no Supabase
// integration yet. Every exported "get"/"build" function below is a pure
// function over local demo data so it can later be swapped for a
// Supabase-backed implementation (see tuitionClassTypes.ts for the
// matching future table shapes) WITHOUT changing how the UI calls it.
//
// UI components should never reach into DEMO_* arrays directly — always
// go through the exported functions, so a future Supabase swap only
// touches this one file.
//
// This is the single canonical data file for the tuition Classes/
// Attendance feature — imported as '../tuitionClassesData' (or the
// '@/pages/tuition/tuitionClassesData' alias) by the Student, Tutor, and
// Admin classes/attendance pages. Do not create a second copy.

import {
  TuitionClass,
  TuitionClassStudent,
  TuitionClassTutor,
  TuitionAttendanceRecord,
  TuitionStudentAttendanceSummary,
} from './tuitionClassTypes';

// ---------------------------------------------------------------------------
// Display status — a UI-facing view of a class's lifecycle that folds the
// stored `status` together with today's date/time (so a "scheduled" class
// shows as "live" or "upcoming" without needing a cron job to flip status
// in the demo data).
// ---------------------------------------------------------------------------

export type TuitionClassDisplayStatus = 'live' | 'upcoming' | 'completed' | 'cancelled';

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

function tutorById(id: string): TuitionClassTutor | undefined {
  return DEMO_TUTORS.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Date/time helpers — demo classes are generated relative to "today" so the
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
  return `${prefix}-${idCounter}`;
}

interface BuildClassInput {
  courseId: string;
  courseName: string;
  subject: string;
  classGrade: string;
  board?: string;
  tutorId: string;
  studentIds: string[];
  dateOffsetDays: number;
  startTime: string;
  endTime: string;
  mode?: TuitionClass['mode'];
  status?: TuitionClass['status'];
  meetingProvider?: TuitionClass['meetingProvider'];
  meetingUrl?: string;
  meetingId?: string;
  attendanceStatus?: TuitionClass['attendanceStatus'];
}

function buildClass(input: BuildClassInput): TuitionClass {
  const tutor = tutorById(input.tutorId);
  const now = new Date().toISOString();

  return {
    id: nextId('class'),
    courseId: input.courseId,
    courseName: input.courseName,
    subject: input.subject,
    classGrade: input.classGrade,
    board: input.board,

    tutorId: input.tutorId,
    tutorName: tutor?.name ?? 'Unassigned Tutor',

    studentIds: input.studentIds,

    date: isoDateOffset(input.dateOffsetDays),
    startTime: input.startTime,
    endTime: input.endTime,
    duration: durationMinutes(input.startTime, input.endTime),

    mode: input.mode ?? 'online',

    meetingProvider: input.meetingProvider ?? 'google-meet',
    meetingUrl: input.meetingUrl ?? 'https://meet.google.com/demo-classroom',
    meetingId: input.meetingId,

    status: input.status ?? 'scheduled',

    attendanceStatus: input.attendanceStatus ?? 'not-marked',

    createdAt: now,
    updatedAt: now,
  };
}

const DEMO_CLASSES: TuitionClass[] = [
  // ---- Today ----
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Mathematics — Algebra Basics',
    classGrade: 'Class 8',
    tutorId: 'tutor-priya-nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    dateOffsetDays: 0,
    startTime: '09:00',
    endTime: '10:00',
  }),
  buildClass({
    courseId: 'science',
    courseName: 'Science (Physics, Chemistry, Biology)',
    subject: 'Science — States of Matter',
    classGrade: 'Class 8',
    tutorId: 'tutor-priya-nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    dateOffsetDays: 0,
    startTime: '16:00',
    endTime: '17:00',
  }),
  buildClass({
    courseId: 'spoken-english',
    courseName: 'Spoken English',
    subject: 'Spoken English — Conversation Practice',
    classGrade: 'Class 9',
    tutorId: 'tutor-anita-menon',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    dateOffsetDays: 0,
    startTime: '11:00',
    endTime: '12:00',
  }),

  // ---- Upcoming ----
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Mathematics — Linear Equations',
    classGrade: 'Class 8',
    tutorId: 'tutor-priya-nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma'],
    dateOffsetDays: 1,
    startTime: '09:00',
    endTime: '10:00',
  }),
  buildClass({
    courseId: 'science',
    courseName: 'Science (Physics, Chemistry, Biology)',
    subject: 'Science — Motion & Force',
    classGrade: 'Class 9',
    tutorId: 'tutor-rahul-verma',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    dateOffsetDays: 3,
    startTime: '15:00',
    endTime: '16:00',
  }),
  buildClass({
    courseId: 'abacus',
    courseName: 'Abacus & Mental Arithmetic',
    subject: 'Abacus — Level 2',
    classGrade: 'Class 6',
    tutorId: 'tutor-suresh-kumar',
    studentIds: ['student-vihaan-joshi'],
    dateOffsetDays: 4,
    startTime: '10:00',
    endTime: '10:45',
  }),

  // ---- Cancelled ----
  buildClass({
    courseId: 'school-tuition',
    courseName: 'School Tuition (All Subjects)',
    subject: 'Social Science — Revision',
    classGrade: 'Class 6',
    tutorId: 'tutor-suresh-kumar',
    studentIds: ['student-vihaan-joshi'],
    dateOffsetDays: 2,
    startTime: '17:00',
    endTime: '18:00',
    status: 'cancelled',
  }),

  // ---- Completed (with attendance already taken) ----
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Mathematics — Fractions',
    classGrade: 'Class 8',
    tutorId: 'tutor-priya-nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    dateOffsetDays: -1,
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    attendanceStatus: 'marked',
  }),
  buildClass({
    courseId: 'spoken-english',
    courseName: 'Spoken English',
    subject: 'Spoken English — Grammar Foundations',
    classGrade: 'Class 9',
    tutorId: 'tutor-anita-menon',
    studentIds: ['student-ishita-rao', 'student-ananya-iyer'],
    dateOffsetDays: -3,
    startTime: '11:00',
    endTime: '12:00',
    status: 'completed',
    attendanceStatus: 'marked',
  }),
  buildClass({
    courseId: 'maths',
    courseName: 'Mathematics',
    subject: 'Mathematics — Intro to Algebra',
    classGrade: 'Class 8',
    tutorId: 'tutor-priya-nair',
    studentIds: ['student-arjun-mehta', 'student-diya-sharma', 'student-kabir-singh'],
    dateOffsetDays: -6,
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    attendanceStatus: 'marked',
  }),
];

// ---------------------------------------------------------------------------
// Demo attendance records — one per (class, student) pair for every
// completed class above. Classes that haven't happened yet intentionally
// have no records (attendance for those is built on demand via
// buildAttendanceRosterForClass).
// ---------------------------------------------------------------------------

function attendanceRecord(
  cls: TuitionClass,
  studentId: string,
  status: TuitionAttendanceRecord['status']
): TuitionAttendanceRecord {
  const student = DEMO_STUDENTS.find((s) => s.id === studentId);
  return {
    id: nextId('attendance'),
    classId: cls.id,
    studentId,
    studentName: student?.name ?? 'Unknown Student',
    status,
    markedAt: cls.date,
  };
}

const completedMathsFractions = DEMO_CLASSES.find(
  (c) => c.subject === 'Mathematics — Fractions'
)!;
const completedSpokenEnglish = DEMO_CLASSES.find(
  (c) => c.subject === 'Spoken English — Grammar Foundations'
)!;
const completedMathsIntro = DEMO_CLASSES.find(
  (c) => c.subject === 'Mathematics — Intro to Algebra'
)!;

const DEMO_ATTENDANCE_RECORDS: TuitionAttendanceRecord[] = [
  // Mathematics — Fractions (yesterday)
  attendanceRecord(completedMathsFractions, 'student-arjun-mehta', 'present'),
  attendanceRecord(completedMathsFractions, 'student-diya-sharma', 'present'),
  attendanceRecord(completedMathsFractions, 'student-kabir-singh', 'absent'),

  // Spoken English — Grammar Foundations (3 days ago)
  attendanceRecord(completedSpokenEnglish, 'student-ishita-rao', 'present'),
  attendanceRecord(completedSpokenEnglish, 'student-ananya-iyer', 'late'),

  // Mathematics — Intro to Algebra (6 days ago)
  attendanceRecord(completedMathsIntro, 'student-arjun-mehta', 'present'),
  attendanceRecord(completedMathsIntro, 'student-diya-sharma', 'late'),
  attendanceRecord(completedMathsIntro, 'student-kabir-singh', 'present'),
];

// ---------------------------------------------------------------------------
// Display status
// ---------------------------------------------------------------------------

/**
 * Derives the UI-facing display status for a class from its stored
 * `status` plus today's date/time. A `scheduled` class automatically
 * reads as `live` while it's in progress today, `completed` once its end
 * time has passed (even if nothing has updated `status` yet), and
 * `upcoming` otherwise.
 */
export function getDisplayStatus(cls: TuitionClass): TuitionClassDisplayStatus {
  if (cls.status === 'cancelled') return 'cancelled';
  if (cls.status === 'completed') return 'completed';

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  if (cls.date < todayIso) {
    return 'completed';
  }

  if (cls.date === todayIso) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = toMinutes(cls.startTime);
    const end = toMinutes(cls.endTime);

    if (nowMinutes >= end) return 'completed';
    if (nowMinutes >= start) return 'live';
    return 'upcoming';
  }

  // Future date.
  return cls.status === 'live' ? 'live' : 'upcoming';
}

// ---------------------------------------------------------------------------
// Class queries
// ---------------------------------------------------------------------------

/** All classes across every tutor/student (admin view). */
export function getAllClasses(): TuitionClass[] {
  return [...DEMO_CLASSES];
}

/** Every class a given student is enrolled in. */
export function getClassesForStudent(studentId: string): TuitionClass[] {
  return DEMO_CLASSES.filter((c) => c.studentIds.includes(studentId));
}

/** Every class taught by a given tutor. */
export function getClassesForTutor(tutorId: string): TuitionClass[] {
  return DEMO_CLASSES.filter((c) => c.tutorId === tutorId);
}

/** The enrolled student records for a class (resolved from studentIds). */
export function getStudentsForClass(cls: TuitionClass): TuitionClassStudent[] {
  return studentsById(cls.studentIds);
}

/**
 * Splits a list of classes into Today / Upcoming / Completed buckets for
 * tab/section rendering. Cancelled classes are excluded — callers that need
 * them (e.g. an admin "Cancelled" tab) filter `getDisplayStatus(c) ===
 * 'cancelled'` separately, matching how the admin Classes page already
 * computes its own cancelled list from `getAllClasses()`.
 */
export function splitClassesByTime(classes: TuitionClass[]): {
  today: TuitionClass[];
  upcoming: TuitionClass[];
  completed: TuitionClass[];
} {
  const todayIso = isoDateOffset(0);

  const today: TuitionClass[] = [];
  const upcoming: TuitionClass[] = [];
  const completed: TuitionClass[] = [];

  for (const cls of classes) {
    const displayStatus = getDisplayStatus(cls);

    if (displayStatus === 'cancelled') continue;

    if (displayStatus === 'completed') {
      completed.push(cls);
    } else if (cls.date === todayIso) {
      today.push(cls);
    } else {
      upcoming.push(cls);
    }
  }

  const byDateTimeAsc = (a: TuitionClass, b: TuitionClass) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date);

  today.sort(byDateTimeAsc);
  upcoming.sort(byDateTimeAsc);
  completed.sort((a, b) => byDateTimeAsc(b, a)); // most recently completed first

  return { today, upcoming, completed };
}

// ---------------------------------------------------------------------------
// Attendance queries
// ---------------------------------------------------------------------------

/** Every attendance record across every class (admin view). */
export function getAllAttendanceRecords(): TuitionAttendanceRecord[] {
  return [...DEMO_ATTENDANCE_RECORDS];
}

/** The recorded attendance for a single class. */
export function getAttendanceForClass(classId: string): TuitionAttendanceRecord[] {
  return DEMO_ATTENDANCE_RECORDS.filter((r) => r.classId === classId);
}

/** Every attendance record for a single student, across all their classes. */
export function getAttendanceRecordsForStudent(studentId: string): TuitionAttendanceRecord[] {
  return DEMO_ATTENDANCE_RECORDS.filter((r) => r.studentId === studentId);
}

/**
 * Builds the attendance roster a tutor sees when taking attendance for a
 * class: one row per enrolled student, pre-filled with any already-saved
 * record, otherwise defaulting to `not-marked`.
 */
export function buildAttendanceRosterForClass(cls: TuitionClass): TuitionAttendanceRecord[] {
  return getStudentsForClass(cls).map((student) => {
    const existing = DEMO_ATTENDANCE_RECORDS.find(
      (r) => r.classId === cls.id && r.studentId === student.id
    );

    if (existing) return { ...existing };

    return {
      id: `attendance-${cls.id}-${student.id}`,
      classId: cls.id,
      studentId: student.id,
      studentName: student.name,
      status: 'not-marked',
    };
  });
}

/** Aggregated attendance stats for one student across all their classes. */
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