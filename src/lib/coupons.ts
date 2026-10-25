import { supabase } from './supabase';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_order_amount: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface CouponResult {
  valid: boolean;
  error?: string;
  discountAmount: number;
  coupon?: Coupon;
}

export async function validateCoupon(code: string, orderAmount: number): Promise<CouponResult> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode || !Number.isFinite(orderAmount) || orderAmount <= 0
    || Math.abs(orderAmount * 100 - Math.round(orderAmount * 100)) > 1e-7) {
    return { valid: false, error: 'Enter a valid coupon code and order amount', discountAmount: 0 };
  }

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[coupons] coupon lookup failed');
    return { valid: false, error: 'We couldn’t verify this coupon right now. Please try again shortly.', discountAmount: 0 };
  }
  if (!data) {
    return { valid: false, error: 'Invalid coupon code', discountAmount: 0 };
  }

  const coupon = data as Coupon;
  const validFromTime = coupon.valid_from ? new Date(coupon.valid_from).getTime() : Number.NaN;
  const validUntilTime = coupon.valid_until ? new Date(coupon.valid_until).getTime() : null;
  const usedCount = Number(coupon.used_count);
  const maxUses = coupon.max_uses === null || coupon.max_uses === undefined ? null : Number(coupon.max_uses);

  // Treat malformed dates or usage counters as invalid configuration rather
  // than accidentally accepting a coupon because date comparisons return false.
  if (!Number.isFinite(validFromTime)
    || (validUntilTime !== null && !Number.isFinite(validUntilTime))
    || (validUntilTime !== null && validUntilTime < validFromTime)
    || !Number.isSafeInteger(usedCount) || usedCount < 0
    || (maxUses !== null && (!Number.isSafeInteger(maxUses) || maxUses < 0))) {
    return { valid: false, error: 'This coupon has invalid validity or usage settings', discountAmount: 0 };
  }

  const now = Date.now();
  if (validFromTime > now) {
    return { valid: false, error: 'Coupon is not yet active', discountAmount: 0 };
  }

  if (validUntilTime !== null && validUntilTime < now) {
    return { valid: false, error: 'Coupon has expired', discountAmount: 0 };
  }

  if (maxUses !== null && usedCount >= maxUses) {
    return { valid: false, error: 'Coupon usage limit reached', discountAmount: 0 };
  }

  const discountValue = Number(coupon.discount_value);
  const minimumOrderAmount = Number(coupon.min_order_amount ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0
    || !['percentage', 'flat'].includes(String(coupon.discount_type))
    || (coupon.discount_type === 'percentage' && discountValue > 100)
    || (coupon.discount_type === 'flat' && Math.abs(discountValue * 100 - Math.round(discountValue * 100)) > 1e-7)
    || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0
    || Math.abs(minimumOrderAmount * 100 - Math.round(minimumOrderAmount * 100)) > 1e-7) {
    return { valid: false, error: 'This coupon has invalid discount settings', discountAmount: 0 };
  }

  if (orderAmount < minimumOrderAmount) {
    return { valid: false, error: `Minimum order amount is ₹${minimumOrderAmount}`, discountAmount: 0 };
  }

  const calculatedDiscount =
    coupon.discount_type === 'percentage'
      ? Math.round((orderAmount * discountValue / 100) * 100) / 100
      : Math.round(discountValue * 100) / 100;

  if (!Number.isFinite(calculatedDiscount) || calculatedDiscount <= 0) {
    return { valid: false, error: 'Discount is invalid for this order', discountAmount: 0 };
  }

  // Match booking-ops: a flat discount is capped at the order total rather
  // than rejected when it exceeds the payable amount.
  const discountAmount = Math.min(calculatedDiscount, Math.round(orderAmount * 100) / 100);
  return { valid: true, discountAmount, coupon };
}

export async function redeemCoupon(
  couponId: string,
  bookingId: string,
  customerId: string | null,
  discountAmount: number,
): Promise<boolean> {
  // customerId is retained for API compatibility only. The Edge Function
  // derives the authoritative customer identity from this server-side token.
  const sessionToken = sessionStorage.getItem('vattams_customer_session') || '';
  const { data, error } = await supabase.functions.invoke('coupon-ops', {
    body: {
      action: 'redeem',
      coupon_id: couponId,
      booking_id: bookingId,
      customer_session_token: sessionToken,
      discount_amount: discountAmount,
    },
  });
  if (error || !data?.success) {
    console.error('[coupons] redemption error:', error || data?.error);
    return false;
  }
  return true;
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[coupons] fetch error:', error);
    return [];
  }

  return (data ?? []) as Coupon[];
}
