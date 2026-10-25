import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Apikey",
  "Content-Type": "application/json",
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...headers, "Access-Control-Allow-Methods": "POST, OPTIONS" },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Allow": "POST, OPTIONS" },
    });
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({ error: "Invalid JSON request body" }), { status: 400, headers });
      }
      throw error;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: "Request body must be a JSON object" }), { status: 400, headers });
    }
    const {
      action,
      coupon_id,
      booking_id,
      discount_amount,
      customer_session_token,
    } = payload as Record<string, unknown>;

    if (action !== "redeem") {
      return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers });
    }

    if (
      typeof coupon_id !== "string" || !coupon_id.trim() ||
      typeof booking_id !== "string" || !booking_id.trim() ||
      typeof customer_session_token !== "string" ||
      !customer_session_token.trim() || customer_session_token.length > 512 ||
      typeof discount_amount !== "number" ||
      !Number.isFinite(discount_amount) ||
      discount_amount <= 0
    ) {
      return new Response(JSON.stringify({ error: "Invalid redemption" }), { status: 400, headers });
    }

    const normalizedCouponId = coupon_id.trim();
    const normalizedBookingId = booking_id.trim();

    const { data: booking, error: bookingLookupError } = await db
      .from("bookings")
      .select("id,status,total_amount,amount,coupon_code,discount_amount,customer_id")
      .eq("id", normalizedBookingId)
      .maybeSingle();

    if (bookingLookupError) {
      console.error("[coupon-ops] booking lookup failed");
      return new Response(JSON.stringify({ error: "Unable to verify booking right now" }), { status: 503, headers });
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers });
    }

    // Coupons should only be redeemed against an active booking. Cancelled or
    // completed jobs must not consume a coupon usage slot.
    if (!["pending", "confirmed"].includes(String(booking.status ?? "").toLowerCase())) {
      return new Response(JSON.stringify({ error: "Coupon redemption is unavailable for this booking status" }), { status: 409, headers });
    }

    // Coupon redemption is a customer-owned operation. Never trust a
    // client-supplied customer_id; derive the identity from the server-side
    // customer session and require it to match the booking owner.
    const sessionToken = customer_session_token.trim();
    if (!sessionToken || !booking.customer_id) {
      return new Response(JSON.stringify({ error: "Customer authentication required" }), { status: 401, headers });
    }

    const { data: session, error: sessionLookupError } = await db
      .from("customer_auth_sessions")
      .select("customer_id,expires_at")
      .eq("token", sessionToken)
      .maybeSingle();

    if (sessionLookupError) {
      console.error("[coupon-ops] customer session lookup failed");
      return new Response(JSON.stringify({ error: "Unable to verify customer session right now" }), { status: 503, headers });
    }

    const sessionExpiresAt = session ? new Date(session.expires_at).getTime() : Number.NaN;
    if (
      !session ||
      !Number.isFinite(sessionExpiresAt) ||
      sessionExpiresAt <= Date.now() ||
      session.customer_id == null ||
      String(session.customer_id) !== String(booking.customer_id)
    ) {
      return new Response(JSON.stringify({ error: "Not authorized for this booking" }), { status: 401, headers });
    }

    if (!booking.coupon_code) {
      return new Response(JSON.stringify({ error: "Booking has no coupon" }), { status: 400, headers });
    }

    const { data: coupon, error: couponLookupError } = await db
      .from("coupons")
      .select("*")
      .eq("id", normalizedCouponId)
      .eq("is_active", true)
      .maybeSingle();

    if (couponLookupError) {
      console.error("[coupon-ops] coupon lookup failed");
      return new Response(JSON.stringify({ error: "Unable to verify coupon right now" }), { status: 503, headers });
    }

    if (!coupon) {
      return new Response(JSON.stringify({ error: "Coupon unavailable" }), { status: 400, headers });
    }

    if (String(coupon.code).toUpperCase() !== String(booking.coupon_code).toUpperCase()) {
      return new Response(JSON.stringify({ error: "Coupon does not match booking" }), { status: 400, headers });
    }

    const storedDiscount = Number(booking.discount_amount);
    const bookingTotalValue = booking.total_amount ?? booking.amount;
    const bookingTotal = Number(bookingTotalValue);

    // Persisted booking amounts must be trustworthy before comparing a
    // client-supplied redemption amount; NaN comparisons otherwise fail open.
    if (booking.discount_amount == null
      || !Number.isFinite(storedDiscount) || storedDiscount <= 0
      || bookingTotalValue == null || !Number.isFinite(bookingTotal) || bookingTotal <= 0
      || storedDiscount > bookingTotal) {
      console.error("[coupon-ops] invalid persisted booking pricing");
      return new Response(JSON.stringify({ error: "Booking pricing needs review" }), { status: 503, headers });
    }

    if (Math.abs(storedDiscount - discount_amount) > 0.01) {
      return new Response(JSON.stringify({ error: "Discount does not match booking" }), { status: 400, headers });
    }

    const now = Date.now();
    const validFrom = coupon.valid_from == null ? Number.NaN : new Date(coupon.valid_from).getTime();
    const validUntil = coupon.valid_until == null ? null : new Date(coupon.valid_until).getTime();
    const usedCount = Number(coupon.used_count);
    const maxUses = coupon.max_uses == null ? null : Number(coupon.max_uses);

    // Fail closed if coupon lifecycle/usage metadata is malformed.
    if (!Number.isFinite(validFrom)
      || (validUntil !== null && !Number.isFinite(validUntil))
      || (validUntil !== null && validUntil < validFrom)
      || !Number.isFinite(usedCount) || usedCount < 0
      || (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 0))) {
      console.error("[coupon-ops] invalid coupon lifecycle or usage configuration");
      return new Response(JSON.stringify({ error: "Coupon configuration needs review" }), { status: 503, headers });
    }

    if (validFrom > now) {
      return new Response(JSON.stringify({ error: "Coupon not active" }), { status: 400, headers });
    }

    if (validUntil !== null && validUntil < now) {
      return new Response(JSON.stringify({ error: "Coupon expired" }), { status: 400, headers });
    }

    if (maxUses !== null && usedCount >= maxUses) {
      return new Response(JSON.stringify({ error: "Coupon usage limit reached" }), { status: 400, headers });
    }

    const discountValue = Number(coupon.discount_value);
    const minimumOrderAmount = Number(coupon.min_order_amount ?? 0);
    if (!Number.isFinite(discountValue) || discountValue <= 0
      || !["percentage", "flat"].includes(String(coupon.discount_type))
      || (coupon.discount_type === "percentage" && discountValue > 100)
      || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      console.error("[coupon-ops] invalid coupon discount configuration");
      return new Response(JSON.stringify({ error: "Coupon configuration needs review" }), { status: 503, headers });
    }

    if (bookingTotal < minimumOrderAmount) {
      return new Response(JSON.stringify({ error: "Booking does not meet the coupon minimum order amount" }), { status: 400, headers });
    }

    const expectedDiscount = Math.min(
      coupon.discount_type === "percentage"
        ? Math.round((bookingTotal * discountValue / 100) * 100) / 100
        : Math.round(discountValue * 100) / 100,
      bookingTotal,
    );
    if (Math.abs(expectedDiscount - storedDiscount) > 0.01) {
      return new Response(JSON.stringify({ error: "Coupon terms no longer match this booking" }), { status: 409, headers });
    }

    if (discount_amount > bookingTotal) {
      return new Response(JSON.stringify({ error: "Invalid discount" }), { status: 400, headers });
    }

    // Redemption + usage reservation must be one database transaction.
    // This prevents concurrent requests from exceeding max_uses and prevents
    // a failed redemption insert from consuming a usage slot.
    const { data: redeemed, error: redeemError } = await db.rpc("redeem_coupon_atomic", {
      p_coupon_id: normalizedCouponId,
      p_booking_id: normalizedBookingId,
      p_customer_id: booking.customer_id,
      p_discount_amount: Number(discount_amount),
    });

    if (redeemError) {
      console.error("[coupon-ops] atomic redemption error:", redeemError);
      return new Response(JSON.stringify({ error: "Unable to redeem coupon" }), { status: 500, headers });
    }

    if (redeemed !== true) {
      return new Response(JSON.stringify({ error: "Coupon already redeemed or unavailable" }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500, headers });
  }
});
