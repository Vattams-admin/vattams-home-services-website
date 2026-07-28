import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as bcrypt from "npm:bcryptjs@2.4.3";

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
  const { full_name, mobile, email, city, specializations, experience_years, id_proof_type, id_proof_number, password } = body;

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
      JSON.stringify({ error: "Your application has been rejected. Please contact support." }),
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
