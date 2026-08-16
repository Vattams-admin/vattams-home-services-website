import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterBody {
  full_name: string;
  mobile: string;
  email?: string;
  city: string;
  service_categories?: string[];
  experience_years?: number;
  id_proof_type?: string;
  id_proof_number?: string;
  password: string;
  whatsapp_number?: string;
  area?: string;
  pincode?: string;
  available_days?: string[];
  working_time?: string;
  has_vehicle?: boolean;
  has_tools?: boolean;
  aadhaar_url?: string;
  pan_url?: string;
  dl_url?: string;
  profile_photo_url?: string;
  bank_name?: string;
  bank_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_id?: string;
  profile_score?: number;
  mobile_verified?: boolean;
}

interface LoginBody {
  identifier: string;
  password: string;
}

interface DocUrlBody {
  admin_id: string;
  technician_id: string;
  doc_type: "aadhaar" | "pan" | "dl";
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

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    const body = await req.json();

    if (action === "register") {
      return await handleRegister(supabase, body as RegisterBody);
    } else if (action === "login") {
      return await handleLogin(supabase, body as LoginBody);
    } else if (action === "doc-url") {
      return await handleDocUrl(supabase, body as DocUrlBody);
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleRegister(supabase: ReturnType<typeof createClient>, body: RegisterBody) {
  const { full_name, mobile, email, city, service_categories, experience_years, id_proof_type, id_proof_number, password,
    whatsapp_number, area, pincode, available_days, working_time, has_vehicle, has_tools,
    aadhaar_url, pan_url, dl_url, profile_photo_url, bank_name, bank_holder_name, bank_account_number, bank_ifsc, upi_id, profile_score, mobile_verified } = body;

  if (!full_name || !mobile || !city || !password) {
    return new Response(
      JSON.stringify({ error: "Missing required fields (full_name, mobile, city, password)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 6 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      full_name,
      mobile,
      email: email || null,
      city,
      service_categories: service_categories || [],
      experience_years: experience_years || 0,
      id_proof_type: id_proof_type || null,
      id_proof_number: id_proof_number || null,
      status: "pending",
      password_hash: passwordHash,
      whatsapp_number: whatsapp_number || null,
      area: area || null,
      pincode: pincode || null,
      available_days: available_days || [],
      working_time: working_time || null,
      has_vehicle: has_vehicle ?? false,
      has_tools: has_tools ?? false,
      aadhaar_url: aadhaar_url || null,
      pan_url: pan_url || null,
      dl_url: dl_url || null,
      profile_photo_url: profile_photo_url || null,
      bank_name: bank_name || null,
      bank_holder_name: bank_holder_name || null,
      bank_account_number: bank_account_number || null,
      bank_ifsc: bank_ifsc || null,
      upi_id: upi_id || null,
      profile_score: profile_score || 0,
      mobile_verified: mobile_verified ?? false,
    })
    .select("id, full_name, mobile, email, city, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return new Response(
        JSON.stringify({ error: "This mobile number is already registered. Please use a different number." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ technician: data }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function handleLogin(supabase: ReturnType<typeof createClient>, body: LoginBody) {
  const { identifier, password } = body;

  if (!identifier || !password) {
    return new Response(
      JSON.stringify({ error: "Missing identifier or password" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Try to find technician by mobile or email
  const isEmail = identifier.includes("@");
  const column = isEmail ? "email" : "mobile";
  const { data: technician, error } = await supabase
    .from("technicians")
    .select("*")
    .eq(column, identifier)
    .maybeSingle();

  if (error || !technician) {
    return new Response(
      JSON.stringify({ error: "No account found with this " + (isEmail ? "email" : "mobile number") }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!technician.password_hash) {
    return new Response(
      JSON.stringify({ error: "Password not set for this account. Please contact support." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const valid = await bcrypt.compare(password, technician.password_hash);
  if (!valid) {
    return new Response(
      JSON.stringify({ error: "Incorrect password. Please try again." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // IMPORTANT: once the password is verified, we always return the
  // technician record — regardless of application status. Blocking login
  // outright for pending/rejected/suspended/inactive technicians (as this
  // endpoint used to do) meant there was no way for a technician to ever
  // see their own application status; they just got a login-form error
  // and a dead end. The frontend (TechnicianLogin) is responsible for
  // routing: `status === 'active'` goes to the dashboard, anything else
  // goes to the Application Status screen. This endpoint's only job is to
  // authenticate the technician and hand back their current record.
  const { password_hash, ...safeTech } = technician;

  return new Response(
    JSON.stringify({ technician: safeTech }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// Mints a short-lived signed URL for a technician's private KYC document
// (Aadhaar / PAN / driving licence) so the Admin Dashboard can display it
// for verification. These files live in the private `technician-docs`
// storage bucket (see the 20260812120000 migration) which has NO select
// policy for anon/authenticated — only this service_role-backed function
// can read them back. `aadhaar_url` / `pan_url` / `dl_url` on the
// technician row store the storage object PATH, not a public URL.
//
// Auth model: same pattern already used by the tuition-tutor-admin edge
// function (see requireActiveAdmin there) — this project's admin login
// (src/pages/AdminLogin.tsx) verifies credentials via the
// `verify_admin_login` RPC and stores only the admin's row id client-side
// (sessionStorage 'vattams_admin'); there is no separate server-verifiable
// session token in the currently deployed login flow. Rather than invent a
// new parallel auth system, we re-check that the supplied admin_id still
// corresponds to an active super_admin row in admin_users on every
// request. This is a minimum bar, not a redesign of admin auth.
async function requireActiveAdmin(
  supabase: ReturnType<typeof createClient>,
  adminId: string | undefined
) {
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

const DOC_COLUMN: Record<DocUrlBody["doc_type"], string> = {
  aadhaar: "aadhaar_url",
  pan: "pan_url",
  dl: "dl_url",
};

async function handleDocUrl(supabase: ReturnType<typeof createClient>, body: DocUrlBody) {
  const { admin_id, technician_id, doc_type } = body;

  const admin = await requireActiveAdmin(supabase, admin_id);
  if (!admin) {
    return new Response(
      JSON.stringify({ error: "Not authorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!technician_id || !doc_type || !DOC_COLUMN[doc_type]) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid technician_id / doc_type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const column = DOC_COLUMN[doc_type];

  const { data: technician, error } = await supabase
    .from("technicians")
    .select(column)
    .eq("id", technician_id)
    .maybeSingle();

  if (error || !technician) {
    return new Response(
      JSON.stringify({ error: "Technician not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const path = (technician as Record<string, string | null>)[column];

  if (!path) {
    return new Response(
      JSON.stringify({ error: "This document was not uploaded by the technician." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Old rows created before the private-bucket fix may still hold a full
  // public URL rather than a bare object path — pass those straight
  // through instead of trying (and failing) to sign them.
  if (/^https?:\/\//i.test(path)) {
    return new Response(
      JSON.stringify({ url: path }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("technician-docs")
    .createSignedUrl(path, 300); // 5-minute expiry

  if (signError || !signed) {
    return new Response(
      JSON.stringify({ error: signError?.message || "Unable to generate document link." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ url: signed.signedUrl }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}