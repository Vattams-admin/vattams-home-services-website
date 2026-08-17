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

export interface TutorRegistrationResult {
  registrationReference: string;
}

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
 * Submits a tutor application.
 */
export async function submitTutorApplication(
  payload: TutorRegistrationPayload
): Promise<TutorRegistrationResult> {
  const registrationReference = crypto.randomUUID();

  const { error } = await supabase.from('tuition_tutors').insert({
    registration_reference: registrationReference,

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
    console.error(
      '[tuitionTutors] submitTutorApplication error:',
      error
    );

    throw new Error(
      'We could not submit your application. Please check your connection and try again.'
    );
  }

  return {
    registrationReference,
  };
}

/**
 * Submit tutor payment UTR securely through the
 * SECURITY DEFINER database function.
 */
export async function submitTuitionTutorPaymentUtr(
  registrationReference: string,
  utr: string
): Promise<void> {
  const reference = registrationReference.trim();
  const paymentReference = utr.trim();

  if (!reference || !paymentReference) {
    throw new Error('A valid payment reference is required.');
  }

  const { error } = await supabase.rpc(
    'submit_tuition_tutor_payment_utr',
    {
      p_registration_reference: reference,
      p_utr: paymentReference,
    }
  );

  if (error) {
    console.error(
      '[tuitionTutors] submitTuitionTutorPaymentUtr error:',
      error
    );

    throw new Error(
      error.message ||
        'Could not submit your payment reference. Please try again.'
    );
  }
}

// ---------------------------------------------------------------------
// Admin: list / approve / reject
// ---------------------------------------------------------------------

export type TutorStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type TutorStatusFilter =
  | TutorStatus
  | 'all';

export type TutorPaymentStatus =
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'failed';

export type TutorApprovalStatus =
  | 'REGISTERED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface TuitionTutorRow {
  id: string;
  registration_reference: string | null;
  utr: string | null;

  employee_id: string | null;
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

  payment_status: TutorPaymentStatus;
  approval_status: TutorApprovalStatus;

  registration_fee: number | null;
  amount_paid: number | null;
  discount_percentage: number | null;

  payment_verified_at: string | null;
  payment_verified_by: string | null;

  approved_at: string | null;
  approved_by: string | null;

  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
}

const TUTOR_ADMIN_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/tuition-tutor-admin`;

function getAdminId(): string | null {
  try {
    return sessionStorage.getItem('vattams_admin');
  } catch {
    return null;
  }
}

async function callTutorAdminFunction(
  body: Record<string, unknown>
) {
  const adminId = getAdminId();

  if (!adminId) {
    throw new Error(
      'Your admin session has expired. Please sign in again.'
    );
  }

  const response = await fetch(
    TUTOR_ADMIN_FUNCTION_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        ...body,
        adminId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || 'Request failed.'
    );
  }

  return result;
}

export async function fetchTuitionTutors(
  status: TutorStatusFilter
): Promise<TuitionTutorRow[]> {
  const result =
    await callTutorAdminFunction({
      action: 'list',
      status,
    });

  return (result.tutors ?? []) as TuitionTutorRow[];
}

export async function approveTuitionTutor(
  tutorId: string
): Promise<void> {
  await callTutorAdminFunction({
    action: 'approve',
    tutorId,
  });
}

/**
 * Rejects a tutor application.
 */
export async function rejectTuitionTutor(
  tutorId: string,
  reason: string
): Promise<void> {
  if (!reason || !reason.trim()) {
    throw new Error(
      'A rejection reason is required.'
    );
  }

  await callTutorAdminFunction({
    action: 'reject',
    tutorId,
    notes: reason.trim(),
  });
}

/**
 * Marks a tutor's registration payment as verified.
 */
export async function verifyTuitionTutorPayment(
  tutorId: string
): Promise<void> {
  await callTutorAdminFunction({
    action: 'verifyPayment',
    tutorId,
  });
}

/**
 * Marks a tutor's registration payment as failed.
 */
export async function markTuitionTutorPaymentFailed(
  tutorId: string
): Promise<void> {
  await callTutorAdminFunction({
    action: 'markPaymentFailed',
    tutorId,
  });
}
