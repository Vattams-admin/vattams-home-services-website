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
  registration_payment_id?: string;
}

interface LoginBody {
  identifier: string;
  password: string;
}

interface DocUrlBody {
  admin_id: string;
  admin_session_token?: string;
  technician_id: string;
  doc_type: "aadhaar" | "pan" | "dl";
}

function generateEmailOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}
async function hashEmailOtp(otp: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(otp));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sendEmailOtp(to: string, otp: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) {
    console.error("Email OTP unavailable: RESEND_API_KEY and EMAIL_FROM must be configured.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to], subject: "Verify your VATTAMS technician registration email",
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2>VATTAMS Home Services</h2><p>Use this one-time code to verify the email address for your technician registration.</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 0">${otp}</div><p>This code expires in 10 minutes. Do not share it with anyone.</p></div>`,
      }),
    });
    if (!response.ok) {
      console.error("Email provider rejected technician OTP", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Technician email OTP delivery failed", error);
    return false;
  }
}
function otpJson(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function startTechnicianRegistrationOtp(supabase: ReturnType<typeof createClient>, body: RegisterBody) {
  const mobile = String(body.mobile || "").replace(/\\D/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!body.full_name?.trim() || !/^[6-9]\\d{9}$/.test(mobile) || !body.password || body.password.length < 6 || !body.city?.trim()) {
    return otpJson({ error: "Valid name, mobile, city and password are required." }, 400);
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return otpJson({ error: "A valid email address is required for technician registration." }, 400);
  const { data: existingMobile } = await supabase.from("technicians").select("id").eq("mobile", mobile).maybeSingle();
  if (existingMobile) return otpJson({ error: "This mobile number is already registered." }, 409);
  const { data: existingEmail } = await supabase.from("technicians").select("id").eq("email", email).maybeSingle();
  if (existingEmail) return otpJson({ error: "This email address is already registered." }, 409);
  const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recent } = await supabase.from("otp_codes").select("id").eq("mobile", mobile).eq("purpose", "technician_registration").gte("created_at", recentCutoff).limit(1).maybeSingle();
  if (recent) return otpJson({ error: "Please wait 60 seconds before requesting another code." }, 429);
  const otp = generateEmailOtp();
  const otpHash = await hashEmailOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const passwordHash = await bcrypt.hash(body.password, await bcrypt.genSalt(10));
  const { data: row, error } = await supabase.from("otp_codes").insert({
    mobile, code: otpHash, purpose: "technician_registration", expires_at: expiresAt,
    registration_data: { ...body, mobile, email, password: undefined, password_hash: passwordHash },
  }).select("id").single();
  if (error || !row) return otpJson({ error: "Could not start registration. Please try again." }, 500);
  if (!await sendEmailOtp(email, otp)) {
    await supabase.from("otp_codes").delete().eq("id", row.id);
    return otpJson({ error: "We could not send the verification email. Registration cannot continue until email delivery is available." }, 503);
  }
  return otpJson({ success: true, message: "Email verification code sent." });
}
async function verifyTechnicianRegistrationOtp(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const mobile = String(body.mobile || "").replace(/\\D/g, "");
  const code = String(body.code || "").trim();
  if (!mobile || !/^\\d{6}$/.test(code)) return otpJson({ error: "Mobile number and 6-digit email OTP are required." }, 400);
  const { data: row } = await supabase.from("otp_codes").select("id,mobile,code,expires_at,attempt_count,registration_data,verified").eq("mobile", mobile).eq("purpose", "technician_registration").eq("verified", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) return otpJson({ error: "No active email verification found. Please request a new code." }, 400);
  if (Number(row.attempt_count || 0) >= 5) return otpJson({ error: "Too many incorrect attempts. Request a new email OTP." }, 429);
  if (new Date(row.expires_at) <= new Date()) return otpJson({ error: "Email OTP expired. Request a new code." }, 400);
  if (await hashEmailOtp(code) !== String(row.code)) {
    const attempts = Number(row.attempt_count || 0) + 1;
    await supabase.from("otp_codes").update({ attempt_count: attempts }).eq("id", row.id).eq("verified", false);
    return otpJson({ error: attempts >= 5 ? "Too many incorrect attempts. Request a new email OTP." : "Incorrect email OTP." }, attempts >= 5 ? 429 : 400);
  }
  const { data: consumed, error: consumeError } = await supabase.from("otp_codes").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", row.id).eq("verified", false).select("id").maybeSingle();
  if (consumeError || !consumed) return otpJson({ error: "Email OTP has already been used. Request a new code." }, 409);
  const pending = row.registration_data as RegisterBody & { password_hash?: string } | null;
  if (!pending || String(pending.mobile || "").replace(/\\D/g, "") !== mobile || !pending.email || !pending.password_hash) {
    return otpJson({ error: "Registration details expired. Please restart registration." }, 400);
  }
  return await handleRegister(supabase, { ...pending, password: "", password_hash: pending.password_hash });
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
      return otpJson({ error: "Email verification is required. Use send-registration-otp, then verify-registration-otp to finish registration." }, 403);
    } else if (action === "send-registration-otp") {
      return await startTechnicianRegistrationOtp(supabase, body as RegisterBody);
    } else if (action === "verify-registration-otp") {
      return await verifyTechnicianRegistrationOtp(supabase, body as Record<string, unknown>);
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
    aadhaar_url, pan_url, dl_url, profile_photo_url, bank_name, bank_holder_name, bank_account_number, bank_ifsc, upi_id, registration_payment_id } = body;

  const normalizedMobile = String(mobile || "").replace(/\D/g, "");
  if (!full_name?.trim() || !normalizedMobile || !city?.trim() || (!password && !body.password_hash)) {
    return new Response(
      JSON.stringify({ error: "Missing required fields (full_name, mobile, city, password)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (password && password.length < 6) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 6 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Technician applications require the one-time ₹49 joining fee.
  // The payment must be linked to this mobile number and have a UTR
  // confirmation before the application can be created.
  if (!registration_payment_id) {
    return new Response(
      JSON.stringify({ error: "₹49 technician joining fee payment is required before submitting your application." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: registrationPayment, error: paymentError } = await supabase
    .from("payments")
    .select("payment_id, payee_type, payee_id, amount, purpose, utr, status")
    .eq("payment_id", registration_payment_id)
    .maybeSingle();

  if (
    paymentError ||
    !registrationPayment ||
    registrationPayment.payee_type !== "technician" ||
    registrationPayment.payee_id !== normalizedMobile ||
    Number(registrationPayment.amount) !== 49 ||
    registrationPayment.purpose !== "registration_fee" ||
    !registrationPayment.utr ||
    !["pending", "success"].includes(String(registrationPayment.status))
  ) {
    return new Response(
      JSON.stringify({ error: "Valid ₹49 technician joining fee payment confirmation is required." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { data, error } = await supabase
    .from("technicians")
    .insert({
      full_name,
      mobile: normalizedMobile,
      registration_payment_id,
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
      // These fields are server-authoritative and are intentionally never
      // accepted from the registration request.
      profile_score: 0,
      mobile_verified: false,
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
    .select("id,full_name,mobile,email,city,service_categories,experience_years,status,whatsapp_number,area,pincode,available_days,working_time,has_vehicle,has_tools,profile_photo_url,rating,total_jobs,completed_jobs,is_online,last_active_at,wallet_balance,wallet_locked,created_at,updated_at,password_hash")
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

  // Mint an opaque server-side session. The browser never uses the technician id as proof of identity.
  const sessionToken = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("technician_auth_sessions").delete().eq("technician_id", technician.id);
  const { error: sessionError } = await supabase.from("technician_auth_sessions").insert({
    technician_id: technician.id,
    token: sessionToken,
    expires_at: expiresAt,
  });
  if (sessionError) {
    return new Response(
      JSON.stringify({ error: "Unable to create secure login session. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { password_hash: _passwordHash, ...safeTech } = technician;
  return new Response(
    JSON.stringify({ technician: safeTech, sessionToken, expiresAt }),
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
// Auth model: uses the Home Services technician/admin authorization pattern
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
  adminId: string | undefined,
  sessionToken: string | undefined
) {
  if (!adminId || !sessionToken) return null;

  const { data: session, error: sessionError } = await supabase
    .from("admin_auth_sessions")
    .select("admin_id,expires_at")
    .eq("token", sessionToken)
    .maybeSingle();

  if (sessionError || !session || session.admin_id !== adminId || new Date(session.expires_at).getTime() <= Date.now()) return null;

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
  const { admin_id, admin_session_token, technician_id, doc_type } = body;

  const admin = await requireActiveAdmin(supabase, admin_id, admin_session_token);
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

  if (/^https?:\/\//i.test(path)) {
    return new Response(
      JSON.stringify({ error: "Legacy public document URL is not allowed. Re-upload the document to the private storage bucket." }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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