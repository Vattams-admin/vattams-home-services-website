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
//   - list              { status?: 'pending' | 'approved' | 'rejected' | 'all' }
//                        (status here is the coarse legacy column; the
//                        response also includes approval_status/payment_status
//                        so the admin UI's Payment Pending / Pending Approval /
//                        Approved / Rejected tabs can filter correctly)
//   - verifyPayment     { tutorId } — payment_status -> verified,
//                        approval_status -> PENDING_APPROVAL
//   - markPaymentFailed { tutorId } — payment_status -> failed
//   - approve           { tutorId, notes? } — requires payment_status ===
//                        'verified'; sets status -> approved, approval_status
//                        -> APPROVED, approved_at/approved_by
//   - reject            { tutorId, notes } — notes required; sets status ->
//                        rejected, approval_status -> REJECTED,
//                        rejected_at/rejected_by/rejection_reason
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

async function getTutorOrError(
  tutorId: string
): Promise<
  | { tutor: { approval_status: string | null; payment_status: string | null } }
  | { error: Response }
> {
  const { data, error } = await supabase
    .from("tuition_tutors")
    .select("id, approval_status, payment_status")
    .eq("id", tutorId)
    .maybeSingle();

  if (error || !data) {
    return { error: errorResponse("Tutor application not found", 404) };
  }

  return { tutor: data };
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

    if (action === "approve" || action === "reject") {
      const tutorId = body.tutorId;
      if (!tutorId) {
        return errorResponse("tutorId is required");
      }

      const existing = await getTutorOrError(tutorId);
      if ("error" in existing) return existing.error;
      const tutor = existing.tutor;

      if (tutor.approval_status === "APPROVED" || tutor.approval_status === "REJECTED") {
        return errorResponse("This application has already been decided");
      }

      const nowIso = new Date().toISOString();
      const notes = typeof body.notes === "string" ? body.notes : null;

      let updatePayload: Record<string, unknown>;

      if (action === "approve") {
        if (tutor.payment_status !== "verified") {
          return errorResponse("Payment must be verified before approval");
        }
        updatePayload = {
          status: "approved",
          approval_status: "APPROVED",
          approved_at: nowIso,
          approved_by: admin.email,
          admin_notes: notes,
          reviewed_at: nowIso,
          reviewed_by_email: admin.email,
        };
      } else {
        if (!notes || !notes.trim()) {
          return errorResponse("A rejection reason is required");
        }
        updatePayload = {
          status: "rejected",
          approval_status: "REJECTED",
          rejected_at: nowIso,
          rejected_by: admin.email,
          rejection_reason: notes.trim(),
          admin_notes: notes,
          reviewed_at: nowIso,
          reviewed_by_email: admin.email,
        };
      }

      const { data, error } = await supabase
        .from("tuition_tutors")
        .update(updatePayload)
        .eq("id", tutorId)
        .select("id, status, approval_status, employee_id")
        .maybeSingle();

      if (error || !data) {
        console.error("[tuition-tutor-admin] update error:", error);
        return errorResponse("Failed to update tutor application");
      }

      return jsonResponse({ success: true, tutor: data });
    }

    if (action === "verifyPayment" || action === "markPaymentFailed") {
      const tutorId = body.tutorId;
      if (!tutorId) {
        return errorResponse("tutorId is required");
      }

      const existing = await getTutorOrError(tutorId);
      if ("error" in existing) return existing.error;
      const tutor = existing.tutor;

      if (tutor.approval_status === "APPROVED" || tutor.approval_status === "REJECTED") {
        return errorResponse("This application has already been decided");
      }

      const updatePayload =
        action === "verifyPayment"
          ? { payment_status: "verified", approval_status: "PENDING_APPROVAL" }
          : { payment_status: "failed" };

      const { data, error } = await supabase
        .from("tuition_tutors")
        .update(updatePayload)
        .eq("id", tutorId)
        .select("id, status, approval_status, payment_status, employee_id")
        .maybeSingle();

      if (error || !data) {
        console.error("[tuition-tutor-admin] payment update error:", error);
        return errorResponse("Failed to update payment status");
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