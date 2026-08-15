// Data access layer for Vattams Online Tuition — Student Registration.
//
// NOTE ON WHY THIS FILE EXISTS: src/pages/tuition/TuitionBooking.tsx
// already imports `submitStudentRegistration` from this path, and the
// tuition_students migration's own comments describe this file as "a
// matching client-side fix" — but the file was never actually created,
// so the public Student Registration form could not persist any
// registration, and the project would not type-check or build without
// it. This file implements exactly the function that was already
// expected to exist, using the same insert-only pattern already used
// by src/lib/tuitionTutors.ts (`submitTutorApplication`) for the
// tuition_tutors table. No other behavior is changed.
//
// Registration (public): direct insert into `tuition_students` using
// the anon key. RLS on that table only grants INSERT to
// anon/authenticated (see the tuition_students migration) — there is
// no public SELECT, so success is verified purely from the insert
// response (error present/absent), never by reading the row back.

import { supabase } from '@/lib/supabase';

export interface StudentRegistrationPayload {
  student_name: string;
  parent_name: string;
  phone: string;
  email: string;
  city: string;
  course: string;
  class_mode: string;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
}

/**
 * Submits a student registration. Resolves only once Supabase has
 * confirmed the row was actually written; rejects (with a readable
 * message) on any failure so the caller can avoid showing a false
 * "success" screen.
 */
export async function submitStudentRegistration(
  payload: StudentRegistrationPayload
): Promise<void> {
  const { error } = await supabase.from('tuition_students').insert({
    student_name: payload.student_name.trim(),
    parent_name: payload.parent_name.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    city: payload.city.trim(),
    course: payload.course.trim(),
    class_mode: payload.class_mode,
    preferred_date: payload.preferred_date || null,
    preferred_time: payload.preferred_time || null,
    message: payload.message?.trim() || null,
  });

  if (error) {
    console.error('[tuitionStudents] submitStudentRegistration error:', error);
    throw new Error(
      'We could not submit your registration. Please check your connection and try again.'
    );
  }
}