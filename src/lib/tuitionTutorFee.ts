// Tutor registration fee + special-offer logic.
//
// IMPORTANT: this is for DISPLAY purposes only (what the UI should show
// a visitor / admin right now). The authoritative, tamper-proof
// calculation happens server-side in the `tuition_tutors` BEFORE INSERT
// trigger (see supabase/migrations/20260816010000_...sql), which is the
// only place that actually writes registration_fee / discount_amount /
// discount_percentage / amount_paid for a row. This module mirrors that
// same logic in TypeScript purely so the registration page can show the
// correct price before the row exists, and so it automatically flips
// back to the regular fee the moment the offer window closes — no
// hardcoded ₹500 anywhere.

export const TUTOR_REGULAR_FEE = 2000;
export const TUTOR_OFFER_FEE = 500;

// Inclusive offer window, matched to the DB trigger.
export const TUTOR_OFFER_START = '2026-08-15';
export const TUTOR_OFFER_END = '2026-09-05';

export interface TutorFeeQuote {
  regularFee: number;
  offerFee: number;
  isOfferActive: boolean;
  amountPayable: number;
  discountAmount: number;
  discountPercentage: number;
  offerStartLabel: string;
  offerEndLabel: string;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the current tutor registration fee quote. Pass a date only in
 * tests — in the app, always call with no argument so it reflects the
 * real current date and the offer expires on its own after 5 Sep 2026.
 */
export function getTutorFeeQuote(now: Date = new Date()): TutorFeeQuote {
  const today = toDateOnly(now);
  const isOfferActive = today >= TUTOR_OFFER_START && today <= TUTOR_OFFER_END;

  const discountAmount = isOfferActive ? TUTOR_REGULAR_FEE - TUTOR_OFFER_FEE : 0;
  const discountPercentage = isOfferActive
    ? Math.round((discountAmount / TUTOR_REGULAR_FEE) * 100)
    : 0;

  return {
    regularFee: TUTOR_REGULAR_FEE,
    offerFee: TUTOR_OFFER_FEE,
    isOfferActive,
    amountPayable: isOfferActive ? TUTOR_OFFER_FEE : TUTOR_REGULAR_FEE,
    discountAmount,
    discountPercentage,
    offerStartLabel: '15 Aug',
    offerEndLabel: '5 Sep',
  };
}

export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}