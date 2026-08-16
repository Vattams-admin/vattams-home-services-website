// Data access layer for Vattams Online Tuition — Student Registration.
//
// Registration (public): direct insert into `tuition_students` using the
// anon key. The table's RLS only grants INSERT to anon/authenticated (see
// the tuition_students migration) — there is no public SELECT, so we
// verify success purely from the insert response (error present/absent),
// never by reading the row back. This mirrors submitTutorApplication in
// src/lib/tuitionTutors.ts.
//
// Admin (list / approve / reject) is handled directly by
// TuitionAdminStudents.tsx / TuitionAdminPanel.tsx via the
// admin_list_tuition_students / admin_update_tuition_student_status RPCs.

import { supabase } from '@/lib/supabase';

export interface StudentRegistrationPayload {
  studentName: string;
  parentName: string;
  phone: string;
  email: string;
  city: string;
  course: string;
  mode: string;
  date: string;
  time: string;
  message: string;
}

/**
 * Submits a student tuition registration. Resolves only once Supabase has
 * confirmed the row was actually written; rejects (with a readable
 * message) on any failure so the caller can avoid showing a false
 * "success" screen.
 */
export async function submitStudentRegistration(
  payload: StudentRegistrationPayload
): Promise<void> {
  const { error } = await supabase.from('tuition_students').insert({
    student_name: payload.studentName.trim(),
    parent_name: payload.parentName.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    city: payload.city.trim(),
    course: payload.course.trim(),
    class_mode: payload.mode,
    preferred_date: payload.date || null,
    preferred_time: payload.time || null,
    message: payload.message?.trim() || null,
  });

  if (error) {
    console.error('[tuitionStudents] submitStudentRegistration error:', error);
    throw new Error('Could not submit your registration. Please try again.');
  }
}