import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => { eq: (col: string, val: unknown) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } };
    update: (data: Record<string, unknown>) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
    insert: (data: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
  };
}

function isFeaturedApplianceService(name: unknown): boolean {
  const value = String(name ?? '').trim().toLowerCase();
  return /(^|\W)ac(\W|$)|air\s*condition/.test(value)
    || value.includes('washing machine')
    || value.includes('refrigerator')
    || value.includes('fridge');
}

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function dispatchPush(
  userType: "customer" | "technician" | "admin",
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[booking-ops] push dispatch skipped: server configuration missing");
    return;
  }
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ userType, userId, title, body, data }),
    });
    if (!response.ok) {
      console.error("[booking-ops] push dispatch failed", { userType, status: response.status });
    }
  } catch (error) {
    console.error("[booking-ops] push dispatch failed", error instanceof Error ? error.message : "unknown");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST for booking operations." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const requestBody: unknown = await req.json();
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return new Response(JSON.stringify({ error: "Request body must be a JSON object." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { action, booking_id, technician_id, otp, purpose, status, booking_action_token, admin_id, admin_session_token, customer_session_token, booking } = requestBody as Record<string, unknown>;

    if (action === "create_booking") {
      if (!booking || typeof booking !== "object" || Array.isArray(booking)) {
        return new Response(JSON.stringify({ error: "Booking details must be provided as a JSON object." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (customer_session_token != null
        && (typeof customer_session_token !== "string"
          || customer_session_token.length === 0
          || customer_session_token.length > 512
          || customer_session_token.trim() !== customer_session_token)) {
        return new Response(JSON.stringify({ error: "Invalid customer session token format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const customerSessionToken = typeof customer_session_token === "string" ? customer_session_token : "";
      let customerId: string | null = null;
      let authenticatedCustomerMobile: string | null = null;
      if (customerSessionToken) {
        const { data: cs, error: sessionLookupError } = await supabase
          .from("customer_auth_sessions")
          .select("customer_id, expires_at")
          .eq("token", customerSessionToken)
          .maybeSingle();
        if (sessionLookupError) {
          console.error("[booking-ops create_booking] customer session lookup failed");
          return new Response(JSON.stringify({ error: "Unable to verify your customer session. Please try again." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const sessionExpiry = cs?.expires_at == null ? Number.NaN : new Date(cs.expires_at).getTime();
        if (!cs || !Number.isFinite(sessionExpiry) || sessionExpiry <= Date.now() || !cs.customer_id) {
          return new Response(JSON.stringify({ error: "Invalid or expired customer session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        customerId = String(cs.customer_id);
        const { data: customer, error: customerLookupError } = await supabase
          .from("customers")
          .select("id,mobile")
          .eq("id", customerId)
          .maybeSingle();
        if (customerLookupError) {
          console.error("[booking-ops create_booking] customer account lookup failed");
          return new Response(JSON.stringify({ error: "Unable to verify your customer account. Please try again." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!customer?.mobile) {
          return new Response(JSON.stringify({ error: "Customer account is incomplete" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        authenticatedCustomerMobile = String(customer.mobile).replace(/\D/g, "");
      }
      const b = booking || {};
      const customerName = String(b.customer_name ?? "").trim();
      const mobileNumber = String(b.mobile_number ?? "").replace(/\D/g, "");
      const city = String(b.city ?? "").trim();
      const address = String(b.address ?? "").trim();
      const problemDescription = String(b.problem_description ?? "").trim();

      if (!customerName || !/^\d{10}$/.test(mobileNumber) || !city || !address || !String(b.service_category ?? "").trim()) {
        return new Response(JSON.stringify({ error: "Enter your name, a valid 10-digit mobile number, city, address, and service." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // For signed-in customers, keep the booking contact number aligned with
      // the verified account number used by customer notifications and tracking.
      if (customerId && authenticatedCustomerMobile && mobileNumber !== authenticatedCustomerMobile) {
        return new Response(JSON.stringify({ error: "Your booking mobile number must match your verified account number. Update your account details or sign in with the correct account before booking." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (customerName.length > 120 || city.length > 100 || address.length > 1000 || problemDescription.length > 2000) {
        return new Response(JSON.stringify({ error: "Some booking details are too long. Please shorten the name, city, address, or problem description and try again." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const preferredDate = b.preferred_date == null || b.preferred_date === "" ? null : String(b.preferred_date);
      const preferredTime = b.preferred_time == null || b.preferred_time === "" ? null : String(b.preferred_time);
      const indiaNowParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const indiaNow = Object.fromEntries(indiaNowParts.map((part) => [part.type, part.value]));
      const indiaToday = `${indiaNow.year}-${indiaNow.month}-${indiaNow.day}`;
      const indiaCurrentMinutes = Number(indiaNow.hour) * 60 + Number(indiaNow.minute);

      if (preferredDate !== null) {
        const parsedDate = new Date(`${preferredDate}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)
          || Number.isNaN(parsedDate.getTime())
          || parsedDate.toISOString().slice(0, 10) !== preferredDate
          || preferredDate < indiaToday) {
          return new Response(JSON.stringify({ error: "Choose a valid preferred date today or later." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      const allowedTimeSlots = [
        "07:00 - 09:00",
        "09:00 - 11:00",
        "11:00 - 13:00",
        "13:00 - 15:00",
        "15:00 - 17:00",
        "17:00 - 19:00",
        "19:00 - 21:00",
      ];
      if (preferredTime !== null && !allowedTimeSlots.includes(preferredTime)) {
        return new Response(JSON.stringify({ error: "Choose a valid preferred time slot." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (preferredDate === indiaToday && preferredTime !== null) {
        const [startHour, startMinute] = preferredTime.split(" - ")[0].split(":").map(Number);
        const slotStartMinutes = startHour * 60 + startMinute;
        if (slotStartMinutes <= indiaCurrentMinutes) {
          return new Response(JSON.stringify({ error: "That time slot has already started or passed. Please choose a later slot." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      if (!isFeaturedApplianceService(b.service_category)) {
        return new Response(JSON.stringify({ error: "Only AC, washing machine, and refrigerator services are currently available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: servicePrice, error: servicePriceError } = await supabase.from("service_prices").select("base_price,gst_rate,platform_fee,commission_rate,is_active").eq("service_name",String(b.service_category)).eq("is_active",true).maybeSingle();
      if (servicePriceError) {
        console.error("[booking-ops create_booking] service pricing lookup failed");
        return new Response(JSON.stringify({ error: "We could not load service pricing. Please try again shortly." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!servicePrice) return new Response(JSON.stringify({ error: "Service is unavailable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const serviceType = String(b.service_type ?? "").trim();
      if (!serviceType) return new Response(JSON.stringify({ error: "Please select a specific job type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Validate the category/type pairing independently of database rows so a
      // caller cannot combine one appliance category with another job type.
      const categoryValue = String(b.service_category ?? "").trim().toLowerCase();
      const allowedServiceTypes = /(^|\W)ac(\W|$)|air\s*condition/.test(categoryValue)
        ? ["General Service", "Installation", "Gas Filling", "Pump Water Service", "Coil Service"]
        : categoryValue.includes("washing machine")
          ? ["Washing Machine Service"]
          : categoryValue.includes("refrigerator") || categoryValue.includes("fridge")
            ? ["Refrigerator Service"]
            : [];
      if (!allowedServiceTypes.includes(serviceType)) {
        return new Response(JSON.stringify({ error: "The selected job type does not match this service category. Please choose a valid option." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: callRate, error: callRateError } = await supabase
        .from("technician_call_rates")
        .select("call_rate_fee")
        .eq("service_category", String(b.service_category))
        .eq("service_type", serviceType)
        .eq("is_active", true)
        .maybeSingle();
      if (callRateError) {
        console.error("[booking-ops create_booking] technician call-rate lookup failed");
        return new Response(JSON.stringify({ error: "We could not verify this job type. Please try again shortly." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!callRate) return new Response(JSON.stringify({ error: "The selected job type is unavailable. Please choose a valid service type." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: customerPrice, error: customerPriceError } = await supabase
        .from("customer_service_prices")
        .select("base_price")
        .eq("service_category", String(b.service_category))
        .eq("service_type", serviceType)
        .eq("is_active", true)
        .maybeSingle();
      if (customerPriceError) {
        console.error("[booking-ops create_booking] customer price lookup failed");
        return new Response(JSON.stringify({ error: "We could not verify the customer price. Please try again shortly." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!customerPrice) return new Response(JSON.stringify({ error: "Customer pricing is not configured for this job type yet. Please select another service or contact support." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const rawBasePrice = Number(customerPrice.base_price);
      const gstRate = Number(servicePrice.gst_rate);
      const rawPlatformFee = Number(servicePrice.platform_fee);
      const commissionRate = Number(servicePrice.commission_rate);
      const rawCallRateFee = Number(callRate.call_rate_fee);

      // Fail closed on broken pricing configuration instead of silently
      // converting null, NaN, or malformed database values into zero.
      if (!Number.isFinite(rawBasePrice) || rawBasePrice <= 0
        || !Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100
        || !Number.isFinite(rawPlatformFee) || rawPlatformFee < 0
        || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100
        || !Number.isFinite(rawCallRateFee) || rawCallRateFee < 0) {
        console.error("[booking-ops create_booking] invalid numeric pricing configuration");
        return new Response(JSON.stringify({ error: "Pricing for this service needs review. Please contact VATTAMS support before booking." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize persisted currency inputs to cents before deriving totals so
      // saved component amounts reconcile with the displayed final amount.
      const basePrice = Math.round(rawBasePrice * 100) / 100;
      const platformFee = Math.round(rawPlatformFee * 100) / 100;
      const callRateFee = Math.round(rawCallRateFee * 100) / 100;
      const gstAmount = Math.round((basePrice * gstRate / 100) * 100) / 100;
      const commissionAmount = Math.round((basePrice * commissionRate / 100) * 100) / 100;
      const totalAmount = Math.round((basePrice + gstAmount + platformFee) * 100) / 100;
      let discountAmount = 0;
      let couponCode: string | null = null;
      let couponId: string | null = null;
      if (b.coupon_code) {
        const normalizedCouponCode = String(b.coupon_code).trim().toUpperCase();
        const { data: coupon, error: couponLookupError } = await supabase
          .from("coupons")
          .select("id,code,discount_type,discount_value,max_uses,used_count,min_order_amount,valid_from,valid_until,is_active")
          .eq("code", normalizedCouponCode)
          .eq("is_active", true)
          .maybeSingle();

        if (couponLookupError) {
          console.error("[booking-ops create_booking] coupon lookup failed");
          return new Response(JSON.stringify({ error: "Unable to verify this coupon. Please try again." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const validFromTime = coupon?.valid_from ? new Date(coupon.valid_from).getTime() : null;
        const validUntilTime = coupon?.valid_until ? new Date(coupon.valid_until).getTime() : null;
        const usedCount = Number(coupon?.used_count);
        const maxUses = coupon?.max_uses === null || coupon?.max_uses === undefined ? null : Number(coupon.max_uses);
        const minimumOrderAmountForValidity = Number(coupon?.min_order_amount ?? 0);
        const invalidValidityConfig = Boolean(coupon) && (
          !coupon?.valid_from
          || validFromTime === null
          || (validFromTime !== null && !Number.isFinite(validFromTime))
          || (validUntilTime !== null && !Number.isFinite(validUntilTime))
          || (validFromTime !== null && validUntilTime !== null && validUntilTime < validFromTime)
          || !Number.isSafeInteger(usedCount) || usedCount < 0
          || (maxUses !== null && (!Number.isSafeInteger(maxUses) || maxUses < 0))
          || !Number.isFinite(minimumOrderAmountForValidity) || minimumOrderAmountForValidity < 0
        );
        if (!coupon
          || invalidValidityConfig
          || (validFromTime !== null && validFromTime > Date.now())
          || (validUntilTime !== null && validUntilTime < Date.now())
          || (maxUses !== null && usedCount >= maxUses)
          || totalAmount < minimumOrderAmountForValidity) {
          return new Response(JSON.stringify({ error: "This coupon is invalid, expired, or unavailable. Please re-validate it." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const discountValue = Number(coupon.discount_value);
        const minimumOrderAmount = Number(coupon.min_order_amount ?? 0);
        if (!Number.isFinite(discountValue) || discountValue <= 0
          || (coupon.discount_type === "percentage" && discountValue > 100)
          || !["percentage", "flat"].includes(String(coupon.discount_type))
          || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
          console.error("[booking-ops create_booking] invalid coupon configuration");
          return new Response(JSON.stringify({ error: "This coupon has invalid discount settings. Please contact VATTAMS support." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const calculatedDiscount = coupon.discount_type === "percentage"
          ? Math.round((totalAmount * discountValue / 100) * 100) / 100
          : Math.round(discountValue * 100) / 100;
        discountAmount = Math.min(calculatedDiscount, totalAmount);

        if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
          return new Response(JSON.stringify({ error: "This coupon discount is invalid for the current booking total." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        couponCode = coupon.code;
        couponId = coupon.id;
      }
      const finalAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);
      const row: Record<string, unknown> = {
        customer_name: String(b.customer_name).slice(0,150),
        mobile_number: authenticatedCustomerMobile || String(b.mobile_number).replace(/\D/g,"").slice(0,10),
        city: String(b.city).slice(0,100),
        address: String(b.address).slice(0,500),
        service_category: String(b.service_category).slice(0,100),
        service_type: serviceType.slice(0,100),
        problem_description: String(b.problem_description ?? "").trim().slice(0,2000),
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        amount: totalAmount,
        base_price: basePrice,
        gst_amount: gstAmount,
        platform_fee: platformFee,
        commission_amount: commissionAmount,
        call_rate_fee: callRateFee,
        total_amount: finalAmount,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        customer_id: customerId,
        status: "pending",
        assigned_technician_id: null,
        ai_booking: Boolean(b.ai_booking),
        urgency: ["normal","urgent","emergency"].includes(String(b.urgency)) ? String(b.urgency) : "normal",
      };
      const { data, error } = await supabase.from("bookings").insert(row).select("id,booking_number,booking_action_token").single();
      if (error || !data?.id || !data?.booking_number) {
        // A database insert failure is a server-side failure, not invalid
        // customer input. Keep database details in server logs only.
        console.error("[booking-ops create_booking] booking insert failed", {
          code: error?.code ?? null,
          message: error?.message ?? "Booking insert returned no booking record",
        });
        return new Response(JSON.stringify({
          error: "We could not confirm your booking. Please contact VATTAMS support before submitting again.",
          code: "BOOKING_CREATE_UNCONFIRMED",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The coupon can become exhausted between the validation above and the
      // booking insert. Finalize the usage against the just-created booking
      // before exposing the booking to the rest of the system. The atomic RPC
      // either reserves a usage slot and records the redemption, or returns
      // false without consuming anything.
      if (couponCode) {
        const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_coupon_atomic", {
          p_coupon_id: couponId,
          p_booking_id: data.id,
          p_customer_id: customerId,
          p_discount_amount: discountAmount,
        });

        // Resolve the coupon ID server-side because create_booking validated
        // by code. Keep the authoritative lookup immediately before the RPC.
        if (redeemError || redeemed !== true) {
          const { error: cleanupError } = await supabase.from("bookings").delete().eq("id", data.id);
          if (cleanupError) {
            // Do not claim rollback succeeded. This needs support review and
            // the client must not blindly retry a potentially existing booking.
            console.error("[booking-ops create_booking] coupon redemption failed and booking cleanup also failed");
            return new Response(JSON.stringify({
              error: "We could not confirm the booking state after coupon redemption failed. Please contact VATTAMS support before trying again.",
              code: "BOOKING_CLEANUP_REQUIRES_REVIEW",
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Coupon is no longer available. Please apply the coupon again." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Create the admin alert server-side. A booking-action token is a customer
      // capability and must never be used to impersonate an administrator.
      const adminNotificationTitle = "New Booking";
      const adminNotificationMessage = `${data.booking_number} — ${row.customer_name} requested ${row.service_category}.`;
      const { error: adminNotificationError } = await supabase.from("notifications").insert({
        recipient_type: "admin",
        recipient_id: "admin",
        title: adminNotificationTitle,
        message: adminNotificationMessage,
        type: "new_booking",
        reference_type: "booking",
        reference_id: String(data.id),
        channels: ["in_app", "push"],
        status: "sent",
        is_read: false,
      });
      if (adminNotificationError) {
        console.error("[booking-ops create_booking] admin notification insert failed");
      } else {
        const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net";
        await dispatchPush("admin", "admin", adminNotificationTitle, adminNotificationMessage, {
          type: "new_booking",
          referenceType: "booking",
          referenceId: String(data.id),
          url: new URL("/#/admin-dashboard", publicAppUrl).toString(),
        });
      }

      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "auto_assign") {
      if (typeof booking_id !== "string" || !booking_id.trim()) {
        return new Response(JSON.stringify({ error: "A valid booking ID is required for technician assignment." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: capabilityBooking, error: capabilityLookupError } = await supabase
        .from("bookings")
        .select("id, booking_action_token")
        .eq("id", booking_id)
        .maybeSingle();
      if (capabilityLookupError) {
        console.error("[booking-ops auto_assign] booking capability lookup failed");
        return new Response(JSON.stringify({ error: "Unable to verify booking authorization. Please try again." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const tokenMatches = Boolean(
        capabilityBooking
        && typeof booking_action_token === "string"
        && booking_action_token.length > 0
        && capabilityBooking.booking_action_token === booking_action_token
      );
      let adminAuthorized = false;
      if (admin_id && admin_session_token) {
        const { data: adminSession, error: adminSessionLookupError } = await supabase
          .from("admin_auth_sessions")
          .select("admin_id, expires_at")
          .eq("token", admin_session_token)
          .maybeSingle();
        if (adminSessionLookupError) {
          console.error("[booking-ops auto_assign] admin session lookup failed");
          return new Response(JSON.stringify({ error: "Unable to verify administrator authorization. Please try again." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const adminSessionExpiry = adminSession?.expires_at == null
          ? Number.NaN
          : new Date(adminSession.expires_at).getTime();
        if (adminSession && adminSession.admin_id === admin_id
          && Number.isFinite(adminSessionExpiry) && adminSessionExpiry > Date.now()) {
          const { data: admin, error: adminLookupError } = await supabase
            .from("admin_users")
            .select("id, role, is_active")
            .eq("id", admin_id)
            .maybeSingle();
          if (adminLookupError) {
            console.error("[booking-ops auto_assign] administrator account lookup failed");
            return new Response(JSON.stringify({ error: "Unable to verify administrator authorization. Please try again." }), {
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          adminAuthorized = Boolean(admin && admin.id === admin_id && admin.role === "super_admin" && admin.is_active === true);
        }
      }
      if (!tokenMatches && !adminAuthorized) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // System automatically finds and assigns the best matching technician —
      // no manual "accept" step required. Falls back silently (booking stays
      // "pending") if no eligible technician is found, so the existing
      // manual accept flow still works as a backup.
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (bookingError) {
        console.error("[booking-ops auto_assign] booking lookup failed");
        return new Response(JSON.stringify({ error: "Unable to load booking details. Please try again." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.status !== "pending" && booking.status !== "confirmed") {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "already_assigned" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Candidate technicians: same city, offers this service, active,
      // account not locked (dues cleared).
      const { data: candidates, error: candidateLookupError } = await supabase
        .from("technicians")
        .select("id, full_name, rating, total_jobs, current_workload, is_online, last_active_at, service_categories")
        .eq("city", booking.city)
        .eq("status", "active")
        .eq("wallet_locked", false)
         as { data: { id: string; full_name: string; rating: number; total_jobs: number; current_workload: number; is_online: boolean; last_active_at: string | null; service_categories: string[] | null }[] | null; error: unknown };
      if (candidateLookupError) {
        console.error("[booking-ops auto_assign] technician candidate lookup failed");
        return new Response(JSON.stringify({ error: "Unable to find eligible technicians right now. Please try again." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const categoryAliases: Record<string, string[]> = {
        "ac service": ["ac service", "ac technician", "ac repair", "air conditioner service"],
        "washing machine": ["washing machine", "washing machine repair", "washing machine technician", "home appliance repair"],
        "refrigerator": ["refrigerator", "refrigerator repair", "fridge", "home appliance repair"],
      };
      const requestedCategory = String(booking.service_category ?? "").trim().toLowerCase();
      const acceptedCategories = categoryAliases[requestedCategory] ?? [requestedCategory];
      const eligibleCandidates = (candidates ?? []).filter((candidate) =>
        (candidate.service_categories ?? []).some((category) =>
          acceptedCategories.includes(String(category).trim().toLowerCase())
        )
      );
      if (eligibleCandidates.length === 0) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "no_eligible_technician" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exclude technicians who already have an active job.
      const candidateIds = eligibleCandidates.map((c) => c.id);
      const { data: busy, error: busyLookupError } = await supabase
        .from("technician_jobs")
        .select("technician_id")
        .in("technician_id", candidateIds)
        .in("status", ["assigned", "accepted", "on_the_way", "in_progress", "job_started"]) as { data: { technician_id: string }[] | null; error: unknown };
      if (busyLookupError) {
        console.error("[booking-ops auto_assign] technician workload lookup failed");
        return new Response(JSON.stringify({ error: "Unable to verify technician availability. Please try again." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const busyIds = new Set((busy ?? []).map((b) => b.technician_id));
      const free = eligibleCandidates.filter((c) => !busyIds.has(c.id));

      if (free.length === 0) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "all_technicians_busy" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fair distribution: online technicians first, then lower workload, then rating; total jobs breaks remaining ties.
      free.sort((a, b) => Number(b.is_online === true) - Number(a.is_online === true) || (Number(a.current_workload || 0) - Number(b.current_workload || 0)) || (Number(b.rating || 0) - Number(a.rating || 0)) || (Number(a.total_jobs || 0) - Number(b.total_jobs || 0)));
      const chosen = free[0];

      const { data: claimedBooking, error: claimError } = await supabase.from("bookings")
        .update({
          assigned_technician_id: chosen.id,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking_id)
        .eq("status", booking.status)
        .is("assigned_technician_id", null)
        .select("id,booking_number,booking_action_token")
        .maybeSingle();
      if (claimError) {
        console.error("[booking-ops auto_assign] conditional booking claim failed");
        return new Response(JSON.stringify({ error: "Unable to reserve this booking for assignment. Please try again." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!claimedBooking) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "booking_already_claimed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: jobData, error: jobInsertError } = await supabase
        .from("technician_jobs")
        .insert({ booking_id, technician_id: chosen.id, status: "assigned", job_amount: Number(booking.base_price ?? 0), call_rate_fee: Number(booking.call_rate_fee) || 0, service_type: String(booking.service_type ?? "") || null })
        .select("*")
        .single() as { data: Record<string, unknown> | null; error: unknown };

      // Do not leave a booking marked assigned when the corresponding job
      // record failed to persist. Restore it to pending only if this request
      // still owns the assignment, so we cannot undo a concurrent admin change.
      if (jobInsertError || !jobData) {
        const { data: rolledBackBooking, error: rollbackError } = await supabase
          .from("bookings")
          .update({
            assigned_technician_id: null,
            // Restore the exact pre-claim state; confirmed bookings must not
            // be downgraded to pending when technician-job creation fails.
            status: booking.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking_id)
          .eq("assigned_technician_id", chosen.id)
          .eq("status", "assigned")
          .select("id")
          .maybeSingle();
        if (rollbackError || !rolledBackBooking) {
          console.error("[booking-ops auto_assign] job insert failed; rollback failed or assignment ownership changed");
        } else {
          console.error("[booking-ops auto_assign] job insert failed; booking returned to pending");
        }
        return new Response(JSON.stringify({
          success: false,
          assigned: false,
          reason: "job_creation_failed",
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Two notification writes here:
      //  1. `technician_notifications` — preserved as-is; TechnicianDashboard
      //     already merges this feed with the shared `notifications` table,
      //     and wallet/commission triggers also write here, so it stays.
      //  2. `notifications` (shared) — this was MISSING before. It's what
      //     powers unread counts, the realtime subscription, and the
      //     customer-facing feed, and is what the manual-assignment path
      //     (AdminDashboard.tsx assignTechnician) already correctly uses.
      //     Without it, an auto-assigned job never reliably showed up as a
      //     "New Job Assigned" notification, and the customer never got a
      //     "Technician Assigned" notification at all for auto-assignment.
      //
      // Not wrapped in a DB transaction with the booking/job writes above:
      // if a notification insert fails, the assignment itself must still
      // stand (a customer with an assigned technician but a missing
      // notification is recoverable; silently un-assigning a technician
      // because a notification insert failed is not). Failures are
      // reported back in the response instead (notification_created /
      // customer_notification_created) rather than surfaced as a 500, so
      // Booking.tsx's fire-and-forget call to this action never breaks the
      // booking flow over a notification hiccup.
      //
      // Duplicate-notification safety: this whole action already exits
      // early above with `assigned: false` whenever booking.status isn't
      // "pending"/"confirmed" — so a retry after a successful assignment
      // can never reach this point a second time for the same booking.
      let notificationCreated = false;
      let customerNotificationCreated = false;

      const { error: techNotifError } = await supabase.from("technician_notifications").insert({
        technician_id: chosen.id,
        type: "job_assigned",
        title: "New Job Assigned",
        message: `You've been automatically assigned a ${booking.service_category} job (Booking #${booking.booking_number}). Check your dashboard for details.`,
      });
      if (techNotifError) {
        console.error("[booking-ops auto_assign] technician_notifications insert error:", techNotifError);
      }

      const { error: sharedTechNotifError } = await supabase.from("notifications").insert({
        recipient_type: "technician",
        recipient_id: chosen.id,
        title: "New Job Assigned",
        message: `You've been assigned a new ${booking.service_category} job (Booking #${booking.booking_number}). Check your dashboard for details.`,
        type: "job_assigned",
        reference_type: "job",
        reference_id: (jobData?.id as string | undefined) ?? null,
        channels: ["in_app", "push"],
        status: "sent",
        is_read: false,
      });
      if (sharedTechNotifError) {
        console.error("[booking-ops auto_assign] shared notifications (technician) insert error:", sharedTechNotifError);
      } else {
        notificationCreated = true;
        const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net";
        await dispatchPush(
          "technician",
          chosen.id,
          "New Job Assigned",
          `You've been assigned a new ${booking.service_category} job (Booking #${booking.booking_number}). Check your dashboard for details.`,
          {
            type: "job_assigned",
            referenceType: "job",
            referenceId: String((jobData?.id as string | undefined) ?? ""),
            url: new URL("/#/technician-dashboard", publicAppUrl).toString(),
          },
        );
      }

      const { error: customerNotifError } = await supabase.from("notifications").insert({
        recipient_type: "customer",
        recipient_id: booking.mobile_number,
        title: "Technician Assigned",
        message: `${chosen.full_name ?? "A technician"} has been assigned to your booking ${booking.booking_number}.`,
        type: "technician_assigned",
        reference_type: "booking",
        reference_id: booking_id,
        channels: ["in_app", "push"],
        status: "sent",
        is_read: false,
      });
      if (customerNotifError) {
        console.error("[booking-ops auto_assign] shared notifications (customer) insert error:", customerNotifError);
      } else {
        customerNotificationCreated = true;
        const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net";
        await dispatchPush(
          "customer",
          String(booking.mobile_number),
          "Technician Assigned",
          `${chosen.full_name ?? "A technician"} has been assigned to your booking ${booking.booking_number}.`,
          {
            type: "technician_assigned",
            referenceType: "booking",
            referenceId: String(booking_id),
            url: new URL("/#/customer-dashboard", publicAppUrl).toString(),
          },
        );
      }

      return new Response(JSON.stringify({
        success: true,
        assigned: true,
        technician_id: chosen.id,
        job: jobData,
        notification_created: notificationCreated,
        customer_notification_created: customerNotificationCreated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_booking") {
      return new Response(JSON.stringify({ error: "Deprecated action" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // First-accept assignment: first technician to accept gets the booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (bookingError || !booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.status !== "pending" && booking.status !== "confirmed") {
        return new Response(JSON.stringify({ error: "Booking already assigned" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy first-accept path is disabled below; new appliance jobs use fixed call-rate dues.
      const { data: techRow, error: techError } = await supabase
        .from("technicians")
        .select("full_name, wallet_locked, commission_due")
        .eq("id", technician_id)
        .maybeSingle() as { data: { full_name: string; wallet_locked: boolean; commission_due: number } | null; error: unknown };

      if (techError || !techRow) {
        return new Response(JSON.stringify({ error: "Technician not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (techRow.wallet_locked) {
        return new Response(JSON.stringify({
          error: `Account paused. Please clear Rs ${techRow.commission_due} in outstanding call-rate dues before accepting a new job.`,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if technician has an active job
      const { data: activeJobs } = await supabase
        .from("technician_jobs")
        .select("id")
        .eq("technician_id", technician_id)
        .in("status", ["assigned", "accepted", "on_the_way", "in_progress", "job_started"]) as { data: unknown[] | null; error: unknown };

      if (activeJobs && activeJobs.length > 0) {
        return new Response(JSON.stringify({ error: "You have an active job. Complete it first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign the booking
      await supabase.from("bookings").update({
        assigned_technician_id: technician_id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      // Create technician_job
      const { data: jobData, error: jobError } = await supabase
        .from("technician_jobs")
        .insert({
          booking_id,
          technician_id,
          status: "assigned",
        })
        .select("*")
        .single() as { data: Record<string, unknown> | null; error: unknown };

      // NOTE: as of this fix, nothing in the frontend actually calls this
      // action — AdminDashboard.tsx's manual-assignment flow writes to
      // `bookings`/`technician_jobs`/`notifications` directly and already
      // creates exactly one technician + one customer notification per
      // assignment (see assignTechnician() there). This block is kept as
      // dead code rather than removed (not asked to delete anything), but
      // brought in line with the same shared-`notifications` behavior as
      // auto_assign above so it doesn't silently regress if something
      // starts calling it later. Since there is no live caller today, this
      // cannot create a duplicate notification for any current flow.
      let notificationCreated = false;
      let customerNotificationCreated = false;

      if (jobData) {
        const { error: techNotifErr } = await supabase.from("notifications").insert({
          recipient_type: "technician",
          recipient_id: technician_id,
          title: "New Job Assigned",
          message: `You've been assigned a new job for booking ${booking.booking_number}. Check your dashboard for details.`,
          type: "job_assigned",
          reference_type: "job",
          reference_id: jobData.id as string,
          channels: ["in_app", "push"],
          status: "sent",
          is_read: false,
        });
        if (techNotifErr) {
          console.error("[booking-ops assign_booking] notifications (technician) insert error:", techNotifErr);
        } else {
          notificationCreated = true;
        }

        const { error: custNotifErr } = await supabase.from("notifications").insert({
          recipient_type: "customer",
          recipient_id: booking.mobile_number,
          title: "Technician Assigned",
          message: `${techRow.full_name ?? "A technician"} has been assigned to your booking ${booking.booking_number}.`,
          type: "technician_assigned",
          reference_type: "booking",
          reference_id: booking_id,
          channels: ["in_app", "push"],
          status: "sent",
          is_read: false,
        });
        if (custNotifErr) {
          console.error("[booking-ops assign_booking] notifications (customer) insert error:", custNotifErr);
        } else {
          customerNotificationCreated = true;
        }
      }

      // Remove from other technicians' view by updating booking status
      // (Other technicians will no longer see it as "pending")

      return new Response(JSON.stringify({
        success: true,
        job: jobData,
        error: jobError,
        notification_created: notificationCreated,
        customer_notification_created: customerNotificationCreated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_otp") {
      return new Response(JSON.stringify({ error: "Deprecated action" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Generate OTP for start or complete job
      const otpCode = generateOTP();
      const column = purpose === "start" ? "start_otp" : "complete_otp";

      await supabase.from("bookings").update({
        [column]: otpCode,
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      return new Response(JSON.stringify({
        success: true,
        otp: otpCode,
        purpose,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_otp") {
      return new Response(JSON.stringify({ error: "Deprecated action" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const storedOTP = purpose === "start" ? booking.start_otp : booking.complete_otp;

      if (storedOTP !== otp) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update booking status based on purpose
      const now = new Date().toISOString();
      if (purpose === "start") {
        await supabase.from("bookings").update({
          status: "job_started",
          otp_verified_at: now,
          job_started_at: now,
          updated_at: now,
        }).eq("id", booking_id);
      } else {
        await supabase.from("bookings").update({
          status: "job_completed",
          job_completed_at: now,
          updated_at: now,
        }).eq("id", booking_id);
      }

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        purpose,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      return new Response(JSON.stringify({ error: "Deprecated action" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabase.from("bookings").update({
        status,
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body. Please check the request and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.error("[booking-ops] unhandled request error:", err instanceof Error ? err.message : "unknown error");
    return new Response(
      JSON.stringify({ error: "The booking request could not be completed. Please try again or contact VATTAMS support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});