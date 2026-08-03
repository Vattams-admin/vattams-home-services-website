import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import bcrypt from "npm:bcryptjs@2.4.3";

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
  specializations?: string[];
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
  const { full_name, mobile, email, city, specializations, experience_years, id_proof_type, id_proof_number, password,
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
      specializations: specializations || [],
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

  // Check status — only active (approved) technicians can log in
  if (technician.status === "pending") {
    return new Response(
      JSON.stringify({ error: "Your application is pending approval. Please wait for admin approval." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (technician.status === "rejected") {
    return new Response(
      JSON.stringify({ error: "Your application has been rejected. " + (technician.rejection_reason || "Please contact support.") }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (technician.status === "suspended") {
    return new Response(
      JSON.stringify({ error: "Your account has been suspended. " + (technician.suspend_reason || "Please contact support.") }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (technician.status === "inactive") {
    return new Response(
      JSON.stringify({ error: "Your account is inactive. Please contact support." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (technician.status !== "active") {
    return new Response(
      JSON.stringify({ error: "Your account is not approved. Please contact support." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Return technician data (excluding password_hash)
  const { password_hash, ...safeTech } = technician;

  return new Response(
    JSON.stringify({ technician: safeTech }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
