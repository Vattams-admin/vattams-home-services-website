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

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, booking_id, technician_id, otp, purpose, status, booking_action_token, admin_id, admin_session_token, customer_session_token, booking } = await req.json();

    if (action === "create_booking") {
      const customerSessionToken = String(customer_session_token || "");
      let customerId: string | null = null;
      let authenticatedCustomerMobile: string | null = null;
      if (customerSessionToken) {
        const { data: cs } = await supabase.from("customer_auth_sessions").select("customer_id, expires_at").eq("token", customerSessionToken).maybeSingle();
        if (!cs || new Date(cs.expires_at).getTime() <= Date.now()) {
          return new Response(JSON.stringify({ error: "Invalid or expired customer session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        customerId = String(cs.customer_id);
        const { data: customer } = await supabase.from("customers").select("id,mobile").eq("id", customerId).maybeSingle();
        if (!customer?.mobile) {
          return new Response(JSON.stringify({ error: "Customer account is incomplete" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        authenticatedCustomerMobile = String(customer.mobile).replace(/\D/g, "");
      }
      const allowedStatuses = new Set(["pending"]);
      const b = booking || {};
      if (!b.customer_name || !b.mobile_number || !b.city || !b.address || !b.service_category || !b.problem_description) {
        return new Response(JSON.stringify({ error: "Required booking fields are missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: servicePrice } = await supabase.from("service_prices").select("base_price,gst_rate,platform_fee,commission_rate,is_active").eq("service_name",String(b.service_category)).eq("is_active",true).maybeSingle();
      if (!servicePrice) return new Response(JSON.stringify({ error: "Service is unavailable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const basePrice = Number(servicePrice.base_price) || 0;
      const gstAmount = Math.round((basePrice * (Number(servicePrice.gst_rate)||0) / 100) * 100) / 100;
      const platformFee = Number(servicePrice.platform_fee) || 0;
      const commissionAmount = Math.round((basePrice * (Number(servicePrice.commission_rate)||0) / 100) * 100) / 100;
      const totalAmount = Math.round((basePrice + gstAmount + platformFee) * 100) / 100;
      let discountAmount = 0;
      let couponCode: string | null = null;
      if (b.coupon_code) {
        const { data: coupon } = await supabase.from("coupons").select("code,discount_type,discount_value,max_uses,used_count,min_order_amount,valid_from,valid_until,is_active").eq("code",String(b.coupon_code).trim().toUpperCase()).eq("is_active",true).maybeSingle();
        if (coupon && (!coupon.valid_from || new Date(coupon.valid_from) <= new Date()) && (!coupon.valid_until || new Date(coupon.valid_until) >= new Date()) && (coupon.max_uses === null || Number(coupon.used_count) < Number(coupon.max_uses)) && totalAmount >= Number(coupon.min_order_amount||0)) {
          discountAmount = coupon.discount_type === "percentage" ? Math.round((totalAmount * Number(coupon.discount_value) / 100) * 100) / 100 : Math.min(totalAmount, Number(coupon.discount_value));
          couponCode = coupon.code;
        }
      }
      const finalAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);
      const row: Record<string, unknown> = {
        customer_name: String(b.customer_name).slice(0,150),
        mobile_number: authenticatedCustomerMobile || String(b.mobile_number).replace(/\D/g,"").slice(0,10),
        city: String(b.city).slice(0,100),
        address: String(b.address).slice(0,500),
        service_category: String(b.service_category).slice(0,100),
        problem_description: String(b.problem_description).slice(0,2000),
        preferred_date: b.preferred_date || null,
        preferred_time: b.preferred_time || null,
        amount: totalAmount,
        base_price: basePrice,
        gst_amount: gstAmount,
        platform_fee: platformFee,
        commission_amount: commissionAmount,
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
      if (error) return new Response(JSON.stringify({ error: "Unable to create booking" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "auto_assign") {
      const { data: capabilityBooking } = await supabase.from("bookings").select("id, booking_action_token").eq("id", booking_id).maybeSingle();
      const tokenMatches = Boolean(capabilityBooking && booking_action_token && capabilityBooking.booking_action_token === booking_action_token);
      let adminAuthorized = false;
      if (admin_id && admin_session_token) {
        const { data: adminSession } = await supabase.from("admin_auth_sessions").select("admin_id, expires_at").eq("token", admin_session_token).maybeSingle();
        if (adminSession && adminSession.admin_id === admin_id && new Date(adminSession.expires_at).getTime() > Date.now()) {
          const { data: admin } = await supabase.from("admin_users").select("id, role, is_active").eq("id", admin_id).maybeSingle();
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

      if (bookingError || !booking) {
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
      const { data: candidates } = await supabase
        .from("technicians")
        .select("id, full_name, rating, total_jobs")
        .eq("city", booking.city)
        .eq("status", "active")
        .eq("wallet_locked", false)
        .contains("service_categories", [booking.service_category]) as { data: { id: string; full_name: string; rating: number; total_jobs: number }[] | null; error: unknown };

      if (!candidates || candidates.length === 0) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "no_eligible_technician" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exclude technicians who already have an active job.
      const candidateIds = candidates.map((c) => c.id);
      const { data: busy } = await supabase
        .from("technician_jobs")
        .select("technician_id")
        .in("technician_id", candidateIds)
        .in("status", ["assigned", "accepted", "on_the_way", "in_progress", "job_started"]) as { data: { technician_id: string }[] | null; error: unknown };

      const busyIds = new Set((busy ?? []).map((b) => b.technician_id));
      const free = candidates.filter((c) => !busyIds.has(c.id));

      if (free.length === 0) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "all_technicians_busy" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // "Best" match: highest rating first, then most completed jobs (experience) as tiebreaker.
      free.sort((a, b) => (b.rating - a.rating) || (b.total_jobs - a.total_jobs));
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
      if (claimError || !claimedBooking) {
        return new Response(JSON.stringify({ success: true, assigned: false, reason: "booking_already_claimed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: jobData } = await supabase
        .from("technician_jobs")
        .insert({ booking_id, technician_id: chosen.id, status: "assigned" })
        .select("*")
        .single() as { data: Record<string, unknown> | null; error: unknown };

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

      // Block technicians who owe platform fee + GST + commission from a previous job
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
          error: `Account locked. Please pay Rs ${techRow.commission_due} (platform fee + GST + commission) from your last job before accepting a new one.`,
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
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});