import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

class RequestBodyTooLargeError extends Error {}
class InvalidRequestBodyError extends Error {}

async function readBoundedJson(req: Request): Promise<Record<string, unknown>> {
  const rawLength = req.headers.get("content-length");
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength)) throw new InvalidRequestBodyError("Invalid Content-Length");
    if (Number(rawLength) > MAX_REQUEST_BYTES) throw new RequestBodyTooLargeError();
  }
  if (!req.body) throw new InvalidRequestBodyError("Request body is required");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new InvalidRequestBodyError("Request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidRequestBodyError("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const body = await readBoundedJson(req);
    const email = body.email;
    const password = body.password;

    if (typeof email !== "string" || typeof password !== "string" ||
        !email.trim() || !password.trim()) {
      return errorResponse("Email and password are required", 400);
    }
    if (email.trim().length > MAX_EMAIL_LENGTH) {
      return errorResponse("Email must be 254 characters or fewer", 400);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return errorResponse("Password must be 128 characters or fewer", 400);
    }

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("id, email, password_hash, role, full_name, is_active")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error || !admin) {
      return errorResponse("Invalid credentials");
    }

    const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!passwordMatch) {
      return errorResponse("Invalid credentials");
    }

    if (admin.role !== "super_admin" || admin.is_active !== true) {
      return errorResponse("This account is not authorized for admin access");
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase.from("admin_auth_sessions").insert({
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
      admin: { id: admin.id, email: admin.email, role: admin.role, full_name: admin.full_name },
    });
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return errorResponse("Request body exceeds the 8 KB limit", 413);
    }
    if (err instanceof InvalidRequestBodyError) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("An unexpected server error occurred", 500);
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