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
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: 'Invalid coupon code', discountAmount: 0 };
  }

  const coupon = data as Coupon;

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { valid: false, error: 'Coupon has expired', discountAmount: 0 };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Coupon usage limit reached', discountAmount: 0 };
  }

  if (orderAmount < coupon.min_order_amount) {
    return { valid: false, error: `Minimum order amount is ₹${coupon.min_order_amount}`, discountAmount: 0 };
  }

  const discountAmount =
    coupon.discount_type === 'percentage'
      ? Math.round((orderAmount * coupon.discount_value / 100) * 100) / 100
      : coupon.discount_value;

  if (discountAmount > orderAmount) {
    return { valid: false, error: 'Discount exceeds order amount', discountAmount: 0 };
  }

  return { valid: true, discountAmount, coupon };
}

export async function redeemCoupon(
  couponId: string,
  bookingId: string,
  customerId: string | null,
  discountAmount: number,
): Promise<boolean> {
  const { error: redemptionError } = await supabase.from('coupon_redemptions').insert({
    coupon_id: couponId,
    booking_id: bookingId,
    customer_id: customerId,
    discount_amount: discountAmount,
  });

  if (redemptionError) {
    console.error('[coupons] redemption insert error:', redemptionError);
    return false;
  }

  const { error: updateError } = await supabase.rpc('increment_coupon_usage', {
    coupon_id: couponId,
  });

  if (updateError) {
    const { error: rawUpdateError } = await supabase
      .from('coupons')
      .update({ used_count: couponId } as never)
      .eq('id', couponId);
    if (rawUpdateError) console.error('[coupons] usage increment error:', rawUpdateError);
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
