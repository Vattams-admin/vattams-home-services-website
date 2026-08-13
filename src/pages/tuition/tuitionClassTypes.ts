// Vattams Online Tuition — Phase 7
// Shared types for Classes, Schedule, and Attendance.
//
// These types describe demo/in-memory data today, but are shaped to map
// directly onto the future Supabase tables described in the Phase 7 spec
// (tuition_classes, tuition_class_schedules, tuition_class_students,
// tuition_attendance). Keeping the shape aligned now means the UI layer
// will not need to change when a real backend is connected — only the
// data/service layer (tuitionClassesData.ts) will.

/** Lifecycle status of a single scheduled class/session. */
export type TuitionClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

/** Delivery mode for a class. */
export type TuitionClassMode = 'online' | 'offline' | 'hybrid';

/**
 * Live-class meeting provider. Intentionally NOT hardcoded to a single
 * vendor — a class may have no provider/link yet, in which case the UI
 * should show a safe "not available yet" state rather than a fake link.
 */
export type TuitionMeetingProvider = 'zoom' | 'google-meet' | 'jitsi' | 'other' | null;

/** Per-student attendance status for a given class. */
export type TuitionAttendanceStatus = 'present' | 'absent' | 'late' | 'not-marked';

/** A single student enrolled in / assigned to a class. */
export interface TuitionClassStudent {
  id: string;
  name: string;
  /** Grade/class the student is in, e.g. "Class 8". */
  grade?: string;
}

/** A tutor who teaches one or more classes. */
export interface TuitionClassTutor {
  id: string;
  name: string;
  subjectExpertise?: string[];
}

/**
 * A single class/batch session — the core Phase 7 data model.
 * Maps to the future tuition_classes + tuition_class_schedules tables.
 */
export interface TuitionClass {
  id: string;
  courseId: string;
  courseName: string;
  subject: string;
  classGrade: string;
  board?: string;

  tutorId: string;
  tutorName: string;

  studentIds: string[];

  /** ISO date string, e.g. "2026-08-13". */
  date: string;
  /** 24h "HH:mm" start time. */
  startTime: string;
  /** 24h "HH:mm" end time. */
  endTime: string;
  /** Duration in minutes (derived, but stored for convenience). */
  duration: number;

  mode: TuitionClassMode;

  /** Future-ready live-class abstraction — no vendor is hardcoded. */
  meetingProvider: TuitionMeetingProvider;
  meetingUrl?: string;
  meetingId?: string;

  status: TuitionClassStatus;

  /**
   * Convenience rollup so list views don't need to join attendance
   * records just to show whether attendance has been taken yet.
   */
  attendanceStatus: 'not-marked' | 'partially-marked' | 'marked';

  createdAt: string;
  updatedAt: string;
}

/** A single student's attendance record for a single class. */
export interface TuitionAttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  status: TuitionAttendanceStatus;
  notes?: string;
  markedAt?: string;
}

/** Aggregated attendance stats for one student across all their classes. */
export interface TuitionStudentAttendanceSummary {
  studentId: string;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
}

// ---------------------------------------------------------------------------
// Future Supabase table shapes (documentation only — not used at runtime).
// Included so the eventual migration/service layer has a single source of
// truth to work from, per the Phase 7 spec. Do not create real Supabase
// tables/migrations from this file.
// ---------------------------------------------------------------------------

/** Mirrors the future tuition_classes table. */
export interface TuitionClassesTableRow {
  id: string;
  course_id: string;
  tutor_id: string;
  subject: string;
  class_grade: string;
  mode: TuitionClassMode;
  status: TuitionClassStatus;
}

/** Mirrors the future tuition_class_schedules table. */
export interface TuitionClassSchedulesTableRow {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  meeting_provider: TuitionMeetingProvider;
  meeting_url: string | null;
}

/** Mirrors the future tuition_class_students table. */
export interface TuitionClassStudentsTableRow {
  id: string;
  class_id: string;
  student_id: string;
}

/** Mirrors the future tuition_attendance table. */
export interface TuitionAttendanceTableRow {
  id: string;
  class_id: string;
  student_id: string;
  status: TuitionAttendanceStatus;
  notes: string | null;
  marked_at: string | null;
}
