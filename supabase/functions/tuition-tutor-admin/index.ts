import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// -----------------------------------------------------------------------
// tuition-tutor-admin
//
// Secure server-side access to the `tuition_tutors` table. The table has
// NO public SELECT/UPDATE policies (see the tuition_tutors migration), so
// this is the only way tutor applications can be listed or have their
// status changed. Uses the service_role key, which is only ever available
// server-side in an edge function — never in frontend code.
//
// Auth model: this project's admin login (see src/pages/AdminLogin.tsx)
// verifies credentials via the `verify_admin_login` RPC and then stores
// only the admin's row id client-side (sessionStorage 'vattams_admin') —
// there is no separate server-verifiable session token in the current,
// actually-deployed login flow. To avoid inventing a new parallel auth
// system (out of scope / explicitly disallowed), this function re-checks
// that the supplied adminId still corresponds to an active super_admin
// row in admin_users on every request, the same check verify_admin_login
// performs at login time. This is a minimum bar, not a redesign of admin
// auth.
//
// Actions (POST body: { action, adminId, ...}):
//   - list          { status?: 'pending' | 'approved' | 'rejected' | 'all' }
//   - verifyPayment { tutorId }
//   - markPaymentFailed { tutorId }
//   - approve       { tutorId }   (requires payment_status = 'verified')
//   - reject        { tutorId, notes }  (notes/reason is required)
//
// Payment + approval workflow columns (registration_fee, discount_amount,
// discount_percentage, amount_paid, payment_status, approval_status,
// approved_at/by, rejected_at/by, rejection_reason) were added in
// supabase/migrations/20260816010000_add_tuition_tutor_payment_approval_fields.sql.
// The legacy `status` column (pending/approved/rejected) and
// reviewed_at/reviewed_by_email are still written on approve/reject so
// the existing employee_id trigger and the pre-existing
// admin_list_tuition_tutors RPC keep working exactly as before — this
// function only ever ADDS fields to those writes, never removes them.
// -----------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function requireActiveAdmin(adminId: string) {
  if (!adminId) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active")
    .eq("id", adminId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.role !== "super_admin" || data.is_active !== true) return null;

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action, adminId } = body ?? {};

    const admin = await requireActiveAdmin(adminId);
    if (!admin) {
      return errorResponse("Not authorized", 401);
    }

    if (action === "list") {
      const status = typeof body.status === "string" ? body.status : "all";

      let query = supabase
        .from("tuition_tutors")
        .select(
          "id, employee_id, full_name, phone, whatsapp, email, city, state, highest_qualification, institution, years_experience, classes_can_teach, teaching_languages, teaching_mode, subjects, exam_prep, introduction, teaching_approach, availability, status, admin_notes, reviewed_at, reviewed_by_email, created_at, updated_at, registration_fee, discount_amount, discount_percentage, amount_paid, payment_status, approval_status, approved_at, approved_by, rejected_at, rejected_by, rejection_reason"
        )
        .order("created_at", { ascending: false });

      if (status !== "all") {
        if (!["pending", "approved", "rejected"].includes(status)) {
          return errorResponse("Invalid status filter");
        }
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[tuition-tutor-admin] list error:", error);
        return errorResponse("Failed to load tutor applications");
      }

      return jsonResponse({ success: true, tutors: data ?? [] });
    }

    if (action === "verifyPayment" || action === "markPaymentFailed") {
      const tutorId = body.tutorId;
      if (!tutorId) {
        return errorResponse("tutorId is required");
      }

      const { data: existing, error: fetchError } = await supabase
        .from("tuition_tutors")
        .select("id, approval_status")
        .eq("id", tutorId)
        .maybeSingle();

      if (fetchError || !existing) {
        return errorResponse("Tutor application not found");
      }

      if (["APPROVED", "REJECTED"].includes(existing.approval_status)) {
        return errorResponse(
          "This application has already been reviewed and its payment status can no longer be changed."
        );
      }

      const update =
        action === "verifyPayment"
          ? { payment_status: "verified", approval_status: "PENDING_APPROVAL" }
          : { payment_status: "failed" };

      const { data, error } = await supabase
        .from("tuition_tutors")
        .update(update)
        .eq("id", tutorId)
        .select("id, payment_status, approval_status")
        .maybeSingle();

      if (error || !data) {
        console.error("[tuition-tutor-admin] payment update error:", error);
        return errorResponse("Failed to update payment status");
      }

      return jsonResponse({ success: true, tutor: data });
    }

    if (action === "approve" || action === "reject") {
      const tutorId = body.tutorId;
      if (!tutorId) {
        return errorResponse("tutorId is required");
      }

      const notes = typeof body.notes === "string" ? body.notes.trim() : "";

      if (action === "reject" && !notes) {
        return errorResponse("A rejection reason is required");
      }

      const { data: existing, error: fetchError } = await supabase
        .from("tuition_tutors")
        .select("id, payment_status, approval_status")
        .eq("id", tutorId)
        .maybeSingle();

      if (fetchError || !existing) {
        return errorResponse("Tutor application not found");
      }

      if (action === "approve" && existing.payment_status !== "verified") {
        return errorResponse(
          "Payment must be verified before this tutor can be approved."
        );
      }

      const nowIso = new Date().toISOString();
      // Legacy fields (status, reviewed_at, reviewed_by_email) are kept
      // in sync unchanged so the existing admin_list_tuition_tutors RPC
      // and the employee_id-assignment trigger continue to work exactly
      // as before.
      const legacyStatus = action === "approve" ? "approved" : "rejected";

      const update =
        action === "approve"
          ? {
              status: legacyStatus,
              approval_status: "APPROVED",
              admin_notes: notes || null,
              reviewed_at: nowIso,
              reviewed_by_email: admin.email,
              approved_at: nowIso,
              approved_by: admin.email,
            }
          : {
              status: legacyStatus,
              approval_status: "REJECTED",
              admin_notes: notes,
              reviewed_at: nowIso,
              reviewed_by_email: admin.email,
              rejected_at: nowIso,
              rejected_by: admin.email,
              rejection_reason: notes,
            };

      const { data, error } = await supabase
        .from("tuition_tutors")
        .update(update)
        .eq("id", tutorId)
        .select("id, status, employee_id, approval_status")
        .maybeSingle();

      if (error || !data) {
        console.error("[tuition-tutor-admin] update error:", error);
        return errorResponse("Failed to update tutor application");
      }

      return jsonResponse({ success: true, tutor: data });
    }

    return errorResponse("Unknown action");
  } catch (err) {
    console.error("[tuition-tutor-admin] unexpected error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "An unexpected error occurred",
      500
    );
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}