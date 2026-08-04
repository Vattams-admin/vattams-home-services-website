import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password?.trim()) {
      return errorResponse("Email and password are required");
    }

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, email, password_hash")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error || !admin) {
      return errorResponse("Invalid credentials");
    }

    const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!passwordMatch) {
      return errorResponse("Invalid credentials");
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase.from("admin_sessions").insert({
      admin_id: admin.id,
      token: sessionToken,
      expires_at: expiresAt,
    });

    if (sessionError) {
      return errorResponse("Failed to create session");
    }

    return jsonResponse({
      success: true,
      message: "Login successful",
      sessionToken,
      expiresAt,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "An unexpected error occurred");
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
