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
  if (typeof code !== 'string' || code.length > 100 || !/^[A-Za-z0-9_-]+$/.test(code.trim())) {
    return { valid: false, error: 'Enter a valid coupon code and order amount', discountAmount: 0 };
  }
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode || !Number.isFinite(orderAmount) || orderAmount <= 0
    || Math.abs(orderAmount * 100 - Math.round(orderAmount * 100)) > 1e-7
    || orderAmount > 1000000000) {
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
  if (typeof coupon.id !== 'string' || !coupon.id.trim() || coupon.id.length > 200
    || typeof coupon.code !== 'string' || coupon.code.length > 100
    || !/^[A-Za-z0-9_-]+$/.test(coupon.code.trim())
    || coupon.code.trim().toUpperCase() !== normalizedCode
    || coupon.is_active !== true) {
    return { valid: false, error: 'Coupon details could not be verified', discountAmount: 0 };
  }
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

  if (!Number.isFinite(calculatedDiscount) || calculatedDiscount <= 0
    || !Number.isFinite(Math.round(orderAmount * 100) / 100)) {
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
  if (typeof couponId !== 'string' || !couponId.trim() || couponId.length > 200
    || typeof bookingId !== 'string' || !bookingId.trim() || bookingId.length > 200
    || !Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > 1000000000
    || Math.abs(discountAmount * 100 - Math.round(discountAmount * 100)) > 1e-7) {
    console.error('[coupons] rejected invalid redemption parameters');
    return false;
  }

  let sessionToken = '';
  try {
    if (typeof sessionStorage === 'undefined') return false;
    sessionToken = sessionStorage.getItem('vattams_customer_session') || '';
  } catch {
    return false;
  }
  if (!sessionToken) return false;

  const { data, error } = await supabase.functions.invoke('coupon-ops', {
    body: {
      action: 'redeem',
      coupon_id: couponId,
      booking_id: bookingId,
      customer_session_token: sessionToken,
      discount_amount: Math.round(discountAmount * 100) / 100,
    },
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data) || data.success !== true) {
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

  if (!Array.isArray(data) || data.length === 0) return [];
  return data.filter((row): row is Coupon => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const coupon = row as Partial<Coupon>;
    return typeof coupon.id === 'string' && Boolean(coupon.id.trim())
      && typeof coupon.code === 'string' && Boolean(coupon.code.trim())
      && ['percentage', 'flat'].includes(String(coupon.discount_type))
      && typeof coupon.discount_value === 'number' && Number.isFinite(coupon.discount_value) && coupon.discount_value > 0
      && (coupon.discount_type !== 'percentage' || coupon.discount_value <= 100)
      && typeof coupon.min_order_amount === 'number' && Number.isFinite(coupon.min_order_amount)
      && coupon.min_order_amount >= 0
      && typeof coupon.used_count === 'number' && Number.isSafeInteger(coupon.used_count) && coupon.used_count >= 0
      && (coupon.max_uses === null || coupon.max_uses === undefined
        || (typeof coupon.max_uses === 'number' && Number.isSafeInteger(coupon.max_uses) && coupon.max_uses >= 0))
      && typeof coupon.valid_from === 'string' && Number.isFinite(new Date(coupon.valid_from).getTime())
      && (coupon.valid_until === null || coupon.valid_until === undefined
        || (typeof coupon.valid_until === 'string' && Number.isFinite(new Date(coupon.valid_until).getTime())
          && new Date(coupon.valid_until).getTime() >= new Date(coupon.valid_from).getTime()))
      && (coupon.max_uses === null || coupon.max_uses === undefined || coupon.used_count < coupon.max_uses)
      && new Date(coupon.valid_from).getTime() <= Date.now()
      && (coupon.valid_until === null || coupon.valid_until === undefined || new Date(coupon.valid_until).getTime() >= Date.now())
      && typeof coupon.is_active === 'boolean' && coupon.is_active === true;
  }) as Coupon[];
}
