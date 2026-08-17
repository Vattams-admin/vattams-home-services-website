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
//   - list     { status?: 'pending' | 'approved' | 'rejected' | 'all' }
//   - approve  { tutorId }
//   - reject   { tutorId, notes? }
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
          "id, employee_id, full_name, phone, whatsapp, email, city, state, highest_qualification, institution, years_experience, classes_can_teach, teaching_languages, teaching_mode, subjects, exam_prep, introduction, teaching_approach, availability, status, admin_notes, reviewed_at, reviewed_by_email, created_at, updated_at"
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

      const nextStatus = action === "approve" ? "approved" : "rejected";
      const notes = typeof body.notes === "string" ? body.notes : null;

      const { data, error } = await supabase
        .from("tuition_tutors")
        .update({
          status: nextStatus,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by_email: admin.email,
        })
        .eq("id", tutorId)
        .select("id, status, employee_id")
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