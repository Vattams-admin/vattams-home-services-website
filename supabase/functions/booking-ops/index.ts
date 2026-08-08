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

    const { action, booking_id, technician_id, otp, purpose, status } = await req.json();

    if (action === "auto_assign") {
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
        .select("id, rating, total_jobs")
        .eq("city", booking.city)
        .eq("status", "active")
        .eq("wallet_locked", false)
        .contains("service_categories", [booking.service_category]) as { data: { id: string; rating: number; total_jobs: number }[] | null; error: unknown };

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

      await supabase.from("bookings").update({
        assigned_technician_id: chosen.id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      const { data: jobData } = await supabase
        .from("technician_jobs")
        .insert({ booking_id, technician_id: chosen.id, status: "assigned" })
        .select("*")
        .single() as { data: Record<string, unknown> | null; error: unknown };

      await supabase.from("technician_notifications").insert({
        technician_id: chosen.id,
        type: "job_assigned",
        title: "New Job Assigned",
        message: `You've been automatically assigned a ${booking.service_category} job (Booking #${booking.booking_number}). Check your dashboard for details.`,
      });

      return new Response(JSON.stringify({
        success: true,
        assigned: true,
        technician_id: chosen.id,
        job: jobData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_booking") {
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
        .select("wallet_locked, commission_due")
        .eq("id", technician_id)
        .maybeSingle() as { data: { wallet_locked: boolean; commission_due: number } | null; error: unknown };

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

      // Remove from other technicians' view by updating booking status
      // (Other technicians will no longer see it as "pending")

      return new Response(JSON.stringify({
        success: true,
        job: jobData,
        error: jobError,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_otp") {
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