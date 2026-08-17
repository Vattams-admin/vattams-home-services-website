// Data access layer for Vattams Online Tuition — Trial Class Booking
// (₹150 / one session).
//
// Backed entirely by tables/RPCs that already exist in this project
// (see supabase/migrations/20260816010000_create_tuition_trial_requests_table.sql
// and supabase/migrations/20260817010000_create_tuition_course_levels.sql).
// This file does not create any new database objects — it only calls
// the existing, already-secured table/RPCs.
//
// Trial requests are only ever taken for the two launch courses, matching
// the DB-level CHECK constraint on tuition_trial_requests.course_slug:
// Abacus (abacus) and Public Speaking (spoken-english).

import { supabase } from '@/lib/supabase';

export const TRIAL_FEE = 150;
export const TRIAL_SESSION_COUNT = 1;

export const TRIAL_COURSES = [
  { slug: 'abacus', name: 'Abacus' },
  { slug: 'spoken-english', name: 'Public Speaking' },
] as const;

export type TrialCourseSlug = (typeof TRIAL_COURSES)[number]['slug'];

export interface TuitionCourseLevel {
  id: string;
  course_slug: string;
  level_name: string;
  display_order: number;
}

export type TrialPaymentStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_FAILED';

export type TrialBookingStatus = 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface TuitionTrialRequest {
  id: string;
  student_name: string;
  parent_name: string;
  mobile: string;
  email: string;
  course_name: string;
  course_slug: string;
  level: string;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  fee_amount: number;
  session_count: number;
  payment_status: TrialPaymentStatus;
  booking_status: TrialBookingStatus;
  utr: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialBookingPayload {
  studentName: string;
  parentName: string;
  mobile: string;
  email: string;
  courseName: string;
  courseSlug: TrialCourseSlug;
  level: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

/**
 * Fetches the active levels for a given trial-eligible course, in display
 * order. Reads directly from tuition_course_levels (public SELECT of
 * active rows only — see its migration).
 */
export async function fetchTrialCourseLevels(
  courseSlug: TrialCourseSlug
): Promise<TuitionCourseLevel[]> {
  const { data, error } = await supabase
    .from('tuition_course_levels')
    .select('id, course_slug, level_name, display_order')
    .eq('course_slug', courseSlug)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[tuitionTrial] fetchTrialCourseLevels error:', error);
    throw new Error('Could not load levels for this course. Please try again.');
  }

  return (data ?? []) as TuitionCourseLevel[];
}

/**
 * Creates a new trial request row (fee/session count/status are pinned
 * server-side by the table's CHECK constraints + RLS WITH CHECK — see
 * the migration). Returns the created row's id so the payment step can
 * reference it.
 */
export async function submitTrialRequest(
  payload: TrialBookingPayload
): Promise<TuitionTrialRequest> {
  const { data, error } = await supabase
    .from('tuition_trial_requests')
    .insert({
      student_name: payload.studentName.trim(),
      parent_name: payload.parentName.trim(),
      mobile: payload.mobile.trim(),
      email: payload.email.trim().toLowerCase(),
      course_name: payload.courseName,
      course_slug: payload.courseSlug,
      level: payload.level,
      preferred_date: payload.preferredDate || null,
      preferred_time: payload.preferredTime || null,
      notes: payload.notes?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[tuitionTrial] submitTrialRequest error:', error);
    throw new Error('Could not submit your trial booking. Please try again.');
  }

  return data as TuitionTrialRequest;
}

/**
 * Student's own "I've paid" self-report step — submits the UPI
 * transaction reference (UTR) via the existing submit_trial_payment_utr
 * RPC. Moves payment_status to PAYMENT_PROCESSING; an admin verifies and
 * confirms the booking afterwards.
 */
export async function submitTrialPaymentUtr(
  trialId: string,
  utr: string
): Promise<TuitionTrialRequest> {
  const { data, error } = await supabase.rpc('submit_trial_payment_utr', {
    p_trial_id: trialId,
    p_utr: utr.trim(),
  });

  if (error) {
    console.error('[tuitionTrial] submitTrialPaymentUtr error:', error);
    throw new Error('Could not submit your payment reference. Please try again.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as TuitionTrialRequest;
}

/**
 * Admin: list all trial requests (newest first) via the existing
 * admin_list_tuition_trial_requests RPC.
 */
export async function adminListTrialRequests(
  adminId: string
): Promise<TuitionTrialRequest[]> {
  const { data, error } = await supabase.rpc('admin_list_tuition_trial_requests', {
    p_admin_id: adminId,
  });

  if (error) {
    console.error('[tuitionTrial] adminListTrialRequests error:', error);
    throw new Error('Could not load trial requests. Please try again.');
  }

  return (data ?? []) as TuitionTrialRequest[];
}

/**
 * Admin: verify payment and/or set booking status via the existing
 * admin_update_tuition_trial_status RPC.
 */
export async function adminUpdateTrialStatus(
  adminId: string,
  trialId: string,
  paymentStatus: TrialPaymentStatus,
  bookingStatus: TrialBookingStatus
): Promise<TuitionTrialRequest> {
  const { data, error } = await supabase.rpc('admin_update_tuition_trial_status', {
    p_admin_id: adminId,
    p_trial_id: trialId,
    p_payment_status: paymentStatus,
    p_booking_status: bookingStatus,
  });

  if (error) {
    console.error('[tuitionTrial] adminUpdateTrialStatus error:', error);
    throw new Error('Could not update this trial request. Please try again.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as TuitionTrialRequest;
}