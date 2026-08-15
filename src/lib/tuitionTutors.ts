// Data access layer for Vattams Online Tuition — Tutor Registration &
// Admin Approval.
//
// Registration (public): direct insert into `tuition_tutors` using the
// anon key. The table's RLS only grants INSERT to anon/authenticated
// (see the tuition_tutors migration) — there is no public SELECT, so we
// verify success purely from the insert response (error present/absent),
// never by reading the row back.
//
// Admin (list / approve / reject): routed through the `tuition-tutor-admin`
// edge function, which uses the service_role key server-side. This mirrors
// how technician-auth / admin-auth are the only ways to touch
// service-role-guarded data in this project.

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

export interface TutorRegistrationPayload {
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  city: string;
  state?: string;

  highest_qualification: string;
  institution?: string;
  years_experience?: string;
  classes_can_teach?: string;
  teaching_languages?: string;
  teaching_mode?: string;

  subjects: string[];
  exam_prep: string[];

  introduction?: string;
  teaching_approach?: string;
  availability?: string;
}

/**
 * Submits a tutor application. Resolves only once Supabase has confirmed
 * the row was actually written; rejects (with a readable message) on any
 * failure so the caller can avoid showing a false "success" screen.
 */
export async function submitTutorApplication(
  payload: TutorRegistrationPayload
): Promise<void> {
  const { error } = await supabase.from('tuition_tutors').insert({
    full_name: payload.full_name.trim(),
    date_of_birth: payload.date_of_birth || null,
    gender: payload.gender || null,
    phone: payload.phone.trim(),
    whatsapp: payload.whatsapp?.trim() || null,
    email: payload.email.trim().toLowerCase(),
    city: payload.city.trim(),
    state: payload.state?.trim() || null,

    highest_qualification: payload.highest_qualification.trim(),
    institution: payload.institution?.trim() || null,
    years_experience: payload.years_experience?.trim() || null,
    classes_can_teach: payload.classes_can_teach?.trim() || null,
    teaching_languages: payload.teaching_languages?.trim() || null,
    teaching_mode: payload.teaching_mode || null,

    subjects: payload.subjects,
    exam_prep: payload.exam_prep,

    introduction: payload.introduction?.trim() || null,
    teaching_approach: payload.teaching_approach?.trim() || null,
    availability: payload.availability?.trim() || null,
  });

  if (error) {
    console.error('[tuitionTutors] submitTutorApplication error:', error);
    throw new Error(
      'We could not submit your application. Please check your connection and try again.'
    );
  }
}

// ---------------------------------------------------------------------
// Admin: list / approve / reject
// ---------------------------------------------------------------------

export type TutorStatus = 'pending' | 'approved' | 'rejected';
export type TutorStatusFilter = TutorStatus | 'all';

export interface TuitionTutorRow {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  city: string;
  state: string | null;
  highest_qualification: string;
  institution: string | null;
  years_experience: string | null;
  classes_can_teach: string | null;
  teaching_languages: string | null;
  teaching_mode: string | null;
  subjects: string[];
  exam_prep: string[];
  introduction: string | null;
  teaching_approach: string | null;
  availability: string | null;
  status: TutorStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  created_at: string;
  updated_at: string;
}

const TUTOR_ADMIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tuition-tutor-admin`;

function getAdminId(): string | null {
  try {
    return sessionStorage.getItem('vattams_admin');
  } catch {
    return null;
  }
}

async function callTutorAdminFunction(body: Record<string, unknown>) {
  const adminId = getAdminId();
  if (!adminId) {
    throw new Error('Your admin session has expired. Please sign in again.');
  }

  const response = await fetch(TUTOR_ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ...body, adminId }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Request failed.');
  }

  return result;
}

export async function fetchTuitionTutors(
  status: TutorStatusFilter
): Promise<TuitionTutorRow[]> {
  const result = await callTutorAdminFunction({ action: 'list', status });
  return (result.tutors ?? []) as TuitionTutorRow[];
}

export async function approveTuitionTutor(tutorId: string): Promise<void> {
  await callTutorAdminFunction({ action: 'approve', tutorId });
}

export async function rejectTuitionTutor(
  tutorId: string,
  notes?: string
): Promise<void> {
  await callTutorAdminFunction({ action: 'reject', tutorId, notes });
}