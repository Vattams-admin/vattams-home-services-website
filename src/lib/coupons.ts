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
  if (!normalizedCode || !Number.isFinite(orderAmount) || orderAmount < 0) {
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

  if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
    return { valid: false, error: 'Coupon is not yet active', discountAmount: 0 };
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, error: 'Coupon has expired', discountAmount: 0 };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Coupon usage limit reached', discountAmount: 0 };
  }

  if (orderAmount < coupon.min_order_amount) {
    return { valid: false, error: `Minimum order amount is ₹${coupon.min_order_amount}`, discountAmount: 0 };
  }

  const discountValue = Number(coupon.discount_value);
  const minimumOrderAmount = Number(coupon.min_order_amount ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0
    || !['percentage', 'flat'].includes(String(coupon.discount_type))
    || (coupon.discount_type === 'percentage' && discountValue > 100)
    || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
    return { valid: false, error: 'This coupon has invalid discount settings', discountAmount: 0 };
  }

  const discountAmount =
    coupon.discount_type === 'percentage'
      ? Math.round((orderAmount * discountValue / 100) * 100) / 100
      : discountValue;

  if (!Number.isFinite(discountAmount) || discountAmount <= 0 || discountAmount > orderAmount) {
    return { valid: false, error: 'Discount exceeds order amount or is invalid', discountAmount: 0 };
  }

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
