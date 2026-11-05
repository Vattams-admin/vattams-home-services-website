import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import bcrypt from "npm:bcryptjs@2.4.3";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  password_hash?: string;
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
  kyc_upload_token?: string;
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
  // Rejection sampling avoids modulo bias across the 900,000 six-digit codes.
  const range = 900_000;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const bytes = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(bytes);
    if (bytes[0] < limit) return String(100_000 + (bytes[0] % range));
  }
}
async function hashEmailOtp(otp: string, mobile: string, otpId: string): Promise<string> {
  const secret = Deno.env.get("OTP_HMAC_SECRET");
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("OTP_HMAC_SECRET must be configured with at least 32 bytes.");
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const message = new TextEncoder().encode(["technician_registration", mobile, otpId, otp].join("\\n"));
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function reserveOtpCooldown(
  client: ReturnType<typeof createClient>, mobile: string,
): Promise<string | null> {
  const token = crypto.randomUUID();
  const { data, error } = await client.rpc("reserve_otp_resend", {
    p_mobile: mobile, p_purpose: "technician_registration", p_reservation_token: token,
  });
  if (error) {
    console.error("Atomic technician OTP cooldown reservation failed:", error.message);
    throw new Error("OTP requests are temporarily unavailable.");
  }
  return data === true ? token : null;
}
async function releaseOtpCooldown(
  client: ReturnType<typeof createClient>, mobile: string, token: string,
): Promise<void> {
  const { error } = await client.rpc("release_otp_resend", {
    p_mobile: mobile, p_purpose: "technician_registration", p_reservation_token: token,
  });
  if (error) console.error("Could not release technician OTP cooldown reservation:", error.message);
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
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function detectKycFile(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)) {
    return { mime: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
    return { mime: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    return { mime: "application/pdf", extension: "pdf" };
  }
  return null;
}

async function startKycUploadSession(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const mobile = String(body.mobile || "").replace(/\D/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[6-9]\d{9}$/.test(mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return otpJson({ error: "A valid mobile number and email are required before KYC upload." }, 400);
  }

  const reservationToken = crypto.randomUUID();
  const { data: reserved, error: rateLimitError } = await supabase.rpc("reserve_technician_kyc_upload_session", {
    p_mobile: mobile,
    p_reservation_token: reservationToken,
  });
  if (rateLimitError) {
    console.error("Atomic technician KYC upload reservation failed:", rateLimitError.message);
    return otpJson({ error: "Could not start secure document upload. Please try again." }, 503);
  }
  if (reserved !== true) {
    return otpJson({ error: "Too many document upload sessions. Please wait before restarting registration." }, 429);
  }

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const uploadToken = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const draftId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error } = await supabase.from("otp_codes").insert({
    mobile,
    code: await sha256Hex(uploadToken),
    purpose: "technician_kyc_upload",
    expires_at: expiresAt,
    registration_data: { draft_id: draftId, email },
  });
  if (error) {
    const { error: releaseError } = await supabase.rpc("release_technician_kyc_upload_session", {
      p_mobile: mobile,
      p_reservation_token: reservationToken,
    });
    if (releaseError) console.error("Could not release failed technician KYC upload reservation:", releaseError.message);
    console.error("Could not create technician KYC upload session:", error.message);
    return otpJson({ error: "Could not start secure document upload. Please try again." }, 500);
  }

  return otpJson({ success: true, upload_token: uploadToken, draft_id: draftId, expires_at: expiresAt });
}

async function readBoundedUploadBody(req: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function uploadKycDocument(supabase: ReturnType<typeof createClient>, req: Request) {
  const maxRequestBytes = 5 * 1024 * 1024 + 64 * 1024;
  const rawContentLength = req.headers.get("content-length");
  if (rawContentLength !== null) {
    // HTTP Content-Length is a decimal digit sequence; Number() alone also
    // accepts exponent notation and surrounding whitespace.
    if (!/^\d+$/.test(rawContentLength)) {
      return otpJson({ error: "Invalid upload content length." }, 400);
    }
    const contentLength = Number(rawContentLength);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
      return otpJson({ error: "Invalid upload content length." }, 400);
    }
    if (contentLength > maxRequestBytes) {
      return otpJson({ error: "KYC files must be 5 MB or smaller." }, 413);
    }
  }

  // Content-Length is optional in browser/proxy requests. Enforce the same
  // limit against the streamed bytes before multipart parsing buffers them.
  const boundedBody = await readBoundedUploadBody(req, maxRequestBytes);
  if (!boundedBody) {
    return otpJson({ error: "KYC files must be 5 MB or smaller." }, 413);
  }
  const headers = new Headers(req.headers);
  headers.delete("content-length");
  let form: FormData;
  try {
    form = await new Request(req.url, { method: "POST", headers, body: boundedBody }).formData();
  } catch {
    return otpJson({ error: "Invalid multipart KYC upload request." }, 400);
  }
  const mobile = String(form.get("mobile") || "").replace(/\D/g, "");
  const token = String(form.get("upload_token") || "");
  const docType = String(form.get("doc_type") || "");
  const file = form.get("file");

  if (!/^[6-9]\d{9}$/.test(mobile) || !/^[a-f0-9]{64}$/.test(token) ||
      !["aadhaar", "pan", "dl"].includes(docType) || !(file instanceof File)) {
    return otpJson({ error: "Invalid KYC upload request." }, 400);
  }
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return otpJson({ error: "KYC files must be between 1 byte and 5 MB." }, 413);
  }

  const tokenHash = await sha256Hex(token);
  const { data: session, error: sessionError } = await supabase.from("otp_codes")
    .select("id,mobile,code,expires_at,verified,registration_data")
    .eq("mobile", mobile).eq("purpose", "technician_kyc_upload")
    .eq("code", tokenHash).eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (sessionError) {
    console.error("Technician KYC upload session lookup failed:", sessionError.message);
    return otpJson({ error: "Unable to validate the secure upload session. Please try again." }, 503);
  }
  if (!session?.registration_data?.draft_id) {
    return otpJson({ error: "KYC upload session is invalid or expired. Restart document upload." }, 401);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectKycFile(bytes);
  if (!detected || (file.type && file.type !== detected.mime)) {
    return otpJson({ error: "File content does not match an allowed JPG, PNG, WebP, or PDF document." }, 415);
  }

  const draftId = String(session.registration_data.draft_id);
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return otpJson({ error: "Invalid upload session." }, 401);
  const objectPath = draftId + "/" + docType;

  const { data, error } = await supabase.storage.from("technician-docs").upload(objectPath, bytes, {
    contentType: detected.mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error || !data) {
    const message = error?.message || "Storage upload failed.";
    const status = /already exists|duplicate/i.test(message) ? 409 : 400;
    return otpJson({ error: status === 409 ? "This document is already uploaded for this registration draft." : "Secure document upload failed." }, status);
  }

  return otpJson({ success: true, path: data.path, doc_type: docType });
}

async function resolveKycPaths(
  supabase: ReturnType<typeof createClient>,
  mobile: string,
  email: string,
  uploadToken: string,
) {
  if (!/^[a-f0-9]{64}$/.test(uploadToken)) return null;
  const { data: session, error } = await supabase.from("otp_codes")
    .select("id,registration_data,expires_at,verified")
    .eq("mobile", mobile).eq("purpose", "technician_kyc_upload")
    .eq("code", await sha256Hex(uploadToken)).eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error("Technician KYC path session lookup failed:", error.message);
    throw new Error("KYC_PATH_SESSION_LOOKUP_FAILED");
  }
  if (!session?.registration_data?.draft_id ||
      String(session.registration_data.email || "").toLowerCase() !== email) return null;

  const draftId = String(session.registration_data.draft_id);
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return null;
  const { data: files, error: listError } = await supabase.storage.from("technician-docs")
    .list(draftId, { limit: 20, offset: 0 });
  if (listError || !files) {
    console.error("Technician KYC Storage listing failed:", listError?.message || "No file listing returned.");
    throw new Error("KYC_STORAGE_LIST_FAILED");
  }

  const findPath = (type: string) => {
    const matches = files.filter((item) => item.name.toLowerCase() === type.toLowerCase());
    return matches.length === 1 ? draftId + "/" + matches[0].name : null;
  };
  const aadhaar = findPath("aadhaar");
  const pan = findPath("pan");
  if (!aadhaar || !pan) return null;

  return { sessionId: session.id, aadhaar_url: aadhaar, pan_url: pan, dl_url: findPath("dl") };
}

async function startTechnicianRegistrationOtp(supabase: ReturnType<typeof createClient>, body: RegisterBody) {
  const mobile = String(body.mobile || "").replace(/\D/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!body.full_name?.trim() || !/^[6-9]\d{9}$/.test(mobile) || !body.password || body.password.length < 6 || !body.city?.trim()) {
    return otpJson({ error: "Valid name, mobile, city and password are required." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return otpJson({ error: "A valid email address is required for technician registration." }, 400);
  const { data: existingMobile, error: existingMobileError } = await supabase.from("technicians").select("id").eq("mobile", mobile).maybeSingle();
  if (existingMobileError) {
    console.error("Technician registration mobile lookup failed:", existingMobileError.message);
    return otpJson({ error: "Unable to validate registration details. Please try again." }, 500);
  }
  if (existingMobile) return otpJson({ error: "This mobile number is already registered." }, 409);
  const { data: existingEmail, error: existingEmailError } = await supabase.from("technicians").select("id").eq("email", email).maybeSingle();
  if (existingEmailError) {
    console.error("Technician registration email lookup failed:", existingEmailError.message);
    return otpJson({ error: "Unable to validate registration details. Please try again." }, 500);
  }
  if (existingEmail) return otpJson({ error: "This email address is already registered." }, 409);
  const uploadToken = String((body as RegisterBody & { kyc_upload_token?: string }).kyc_upload_token || "");
  let kycPaths: Awaited<ReturnType<typeof resolveKycPaths>>;
  try {
    kycPaths = await resolveKycPaths(supabase, mobile, email, uploadToken);
  } catch (error) {
    console.error("Technician registration KYC validation failed:", error instanceof Error ? error.message : String(error));
    return otpJson({ error: "Unable to validate uploaded KYC documents. Please try again." }, 503);
  }
  if (!kycPaths) return otpJson({ error: "Upload your Aadhaar and PAN documents through the secure registration upload flow before requesting email verification." }, 400);

  // Complete fallible cryptographic/password preparation before reserving the cooldown.
  // A missing HMAC secret or crypto failure must not strand a 60-second reservation.
  const otp = generateEmailOtp();
  const otpId = crypto.randomUUID();
  const otpHash = await hashEmailOtp(otp, mobile, otpId);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const passwordHash = await bcrypt.hash(body.password, await bcrypt.genSalt(10));

  let reservationToken: string | null;
  try {
    reservationToken = await reserveOtpCooldown(supabase, mobile);
  } catch {
    return otpJson({ error: "OTP requests are temporarily unavailable. Please try again later." }, 503);
  }
  if (!reservationToken) return otpJson({ error: "Please wait 60 seconds before requesting another code." }, 429);
  const safeBody = { ...body } as RegisterBody;
  delete (safeBody as RegisterBody & { kyc_upload_token?: string }).kyc_upload_token;
  const { data: row, error } = await supabase.from("otp_codes").insert({
    id: otpId, mobile, code: otpHash, purpose: "technician_registration", expires_at: expiresAt,
    registration_data: { ...safeBody, ...kycPaths, mobile, email, password: undefined, password_hash: passwordHash },
  }).select("id").single();
  if (error || !row) {
    await releaseOtpCooldown(supabase, mobile, reservationToken);
    return otpJson({ error: "Could not start registration. Please try again." }, 500);
  }
  if (!await sendEmailOtp(email, otp)) {
    await supabase.from("otp_codes").delete().eq("id", row.id);
    await releaseOtpCooldown(supabase, mobile, reservationToken);
    return otpJson({ error: "We could not send the verification email. Registration cannot continue until email delivery is available." }, 503);
  }
  // Remove superseded pending registration payloads only after the new email is accepted.
  // If delivery fails, the applicant can still use the previous pending OTP.
  const { error: cleanupError } = await supabase.from("otp_codes")
    .delete()
    .eq("mobile", mobile)
    .eq("purpose", "technician_registration")
    .eq("verified", false)
    .neq("id", row.id);
  if (cleanupError) {
    console.error("Could not remove superseded technician OTP rows after initial send:", cleanupError.message);
  }
  return otpJson({ success: true, message: "Email verification code sent." });
}
async function resendTechnicianRegistrationOtp(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const mobile = String(body.mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) return otpJson({ error: "A valid mobile number is required to resend the email OTP." }, 400);
  const { data: pendingRow } = await supabase.from("otp_codes")
    .select("mobile,registration_data,created_at,verified")
    .eq("mobile", mobile).eq("purpose", "technician_registration")
    .eq("verified", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!pendingRow || !pendingRow.registration_data) return otpJson({ error: "No pending technician registration found. Please restart registration." }, 400);
  const pending = pendingRow.registration_data as RegisterBody & { password_hash?: string };
  const email = String(pending.email || "").trim().toLowerCase();
  if (!email || !pending.password_hash) return otpJson({ error: "Registration details expired. Please restart registration." }, 400);
  let reservationToken: string | null;
  try {
    reservationToken = await reserveOtpCooldown(supabase, mobile);
  } catch {
    return otpJson({ error: "OTP requests are temporarily unavailable. Please try again later." }, 503);
  }
  if (!reservationToken) return otpJson({ error: "Please wait 60 seconds before requesting another code." }, 429);
  const otp = generateEmailOtp();
  const otpId = crypto.randomUUID();
  const otpHash = await hashEmailOtp(otp, mobile, otpId);
  const { data: row, error } = await supabase.from("otp_codes").insert({
    id: otpId, mobile, code: otpHash, purpose: "technician_registration",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    registration_data: pending,
  }).select("id").single();
  if (error || !row) {
    await releaseOtpCooldown(supabase, mobile, reservationToken);
    return otpJson({ error: "Could not resend the code. Please try again." }, 500);
  }
  if (!await sendEmailOtp(email, otp)) {
    await supabase.from("otp_codes").delete().eq("id", row.id);
    await releaseOtpCooldown(supabase, mobile, reservationToken);
    return otpJson({ error: "We could not send the verification email. Please try again later." }, 503);
  }
  // Only after delivery succeeds, remove older pending OTP rows so they do not
  // retain duplicate copies of the applicant's sensitive registration payload.
  const { error: cleanupError } = await supabase.from("otp_codes")
    .delete()
    .eq("mobile", mobile)
    .eq("purpose", "technician_registration")
    .eq("verified", false)
    .neq("id", row.id);
  if (cleanupError) {
    console.error("Could not remove superseded technician OTP rows:", cleanupError.message);
  }
  return otpJson({ success: true, message: "A new email verification code was sent." });
}
async function verifyTechnicianRegistrationOtp(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const mobile = String(body.mobile || "").replace(/\D/g, "");
  const code = String(body.code || "").trim();
  if (!mobile || !/^\d{6}$/.test(code)) return otpJson({ error: "Mobile number and 6-digit email OTP are required." }, 400);
  const { data: row, error: lookupError } = await supabase.from("otp_codes").select("id,mobile,code,expires_at,attempt_count,registration_data,verified").eq("mobile", mobile).eq("purpose", "technician_registration").eq("verified", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) {
    console.error("Technician registration OTP lookup failed:", lookupError.message);
    return otpJson({ error: "Unable to verify the registration code right now. Please try again." }, 503);
  }
  if (!row) return otpJson({ error: "No active email verification found. Please request a new code." }, 400);
  if (Number(row.attempt_count || 0) >= 5) return otpJson({ error: "Too many incorrect attempts. Request a new email OTP." }, 429);
  if (new Date(row.expires_at) <= new Date()) return otpJson({ error: "Email OTP expired. Request a new code." }, 400);
  if (await hashEmailOtp(code, mobile, String(row.id)) !== String(row.code)) {
    const { data: attempts, error: attemptError } = await supabase.rpc("increment_otp_attempt_count", { p_otp_id: row.id });
    if (attemptError || attempts == null) {
      console.error("Could not atomically increment technician OTP attempts:", attemptError?.message);
      return otpJson({ error: "Could not verify OTP right now. Please try again." }, 500);
    }
    const nextAttempts = Number(attempts);
    return otpJson({ error: nextAttempts >= 5 ? "Too many incorrect attempts. Request a new email OTP." : "Incorrect email OTP." }, nextAttempts >= 5 ? 429 : 400);
  }
  const { data: consumed, error: consumeError } = await supabase.from("otp_codes").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", row.id).eq("verified", false).select("id").maybeSingle();
  if (consumeError) {
    console.error("Technician registration OTP consumption failed:", consumeError.message);
    return otpJson({ error: "Unable to verify the registration code right now. Please try again." }, 503);
  }
  if (!consumed) return otpJson({ error: "Email OTP has already been used. Request a new code." }, 409);
  const pending = row.registration_data as RegisterBody & { password_hash?: string } | null;
  if (!pending || String(pending.mobile || "").replace(/\D/g, "") !== mobile || !pending.email || !pending.password_hash) {
    return otpJson({ error: "Registration details expired. Please restart registration." }, 400);
  }
  const registrationResponse = await handleRegister(supabase, { ...pending, password: "", password_hash: pending.password_hash });
  // Keep the OTP available if registration fails (for example, if the joining-fee
  // payment confirmation is not ready yet). Consume it permanently only on success.
  if (!registrationResponse.ok) {
    const { error: restoreError } = await supabase.from("otp_codes")
      .update({ verified: false, verified_at: null })
      .eq("id", row.id).eq("verified", true);
    if (restoreError) {
      console.error("Could not restore OTP after failed technician registration:", restoreError.message);
    }
  } else {
    // The account has been created; remove sensitive pending form data from the OTP record.
    const { error: cleanupError } = await supabase.from("otp_codes")
      .update({ registration_data: null })
      .eq("mobile", mobile).eq("purpose", "technician_registration");
    const { error: uploadCleanupError } = await supabase.from("otp_codes")
      .delete().eq("mobile", mobile).eq("purpose", "technician_kyc_upload");
    if (uploadCleanupError) console.error("Could not clear consumed KYC upload session:", uploadCleanupError.message);
    if (cleanupError) {
      console.error("Could not clear sensitive registration data from consumed OTP:", cleanupError.message);
    }
  }
  return registrationResponse;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Every action in this function is a POST operation. Reject other methods
  // before reading a body so GET/HEAD probes cannot become JSON parse 500s.
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" } },
    );
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  const supportedActions = new Set([
    "upload-kyc-document",
    "start-kyc-upload-session",
    "register",
    "send-registration-otp",
    "verify-registration-otp",
    "resend-registration-otp",
    "login",
    "doc-url",
  ]);
  if (!action || !supportedActions.has(action)) {
    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "upload-kyc-document") {
      return await uploadKycDocument(supabase, req);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return otpJson({ error: "Request body must be valid JSON." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return otpJson({ error: "Request body must be a JSON object." }, 400);
    }

    if (action === "start-kyc-upload-session") {
      return await startKycUploadSession(supabase, body as Record<string, unknown>);
    } else if (action === "register") {
      return otpJson({ error: "Email verification is required. Use send-registration-otp, then verify-registration-otp to finish registration." }, 403);
    } else if (action === "send-registration-otp") {
      return await startTechnicianRegistrationOtp(supabase, body as RegisterBody);
    } else if (action === "verify-registration-otp") {
      return await verifyTechnicianRegistrationOtp(supabase, body as Record<string, unknown>);
    } else if (action === "resend-registration-otp") {
      return await resendTechnicianRegistrationOtp(supabase, body as Record<string, unknown>);
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
  // The payment must be linked to this mobile number and independently
  // verified by an active administrator before the application can be created.
  // A submitted UTR or pending payment is not settlement confirmation.
  if (!registration_payment_id) {
    return new Response(
      JSON.stringify({ error: "₹49 technician joining fee payment is required before submitting your application." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: registrationPayment, error: paymentError } = await supabase
    .from("payments")
    .select("payment_id, payee_type, payee_id, amount, purpose, utr, status, verified_by, verified_at")
    .eq("payment_id", registration_payment_id)
    .maybeSingle();

  if (
    paymentError ||
    !registrationPayment ||
    registrationPayment.payee_type !== "technician" ||
    registrationPayment.payee_id !== normalizedMobile ||
    Number(registrationPayment.amount) !== 49 ||
    registrationPayment.purpose !== "registration_fee" ||
    !String(registrationPayment.utr || "").trim() ||
    registrationPayment.status !== "success" ||
    !String(registrationPayment.verified_by || "").trim() ||
    !registrationPayment.verified_at ||
    !Number.isFinite(Date.parse(String(registrationPayment.verified_at)))
  ) {
    return new Response(
      JSON.stringify({ error: "Valid ₹49 technician joining fee payment confirmation is required." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const passwordHash = body.password_hash || await bcrypt.hash(password, await bcrypt.genSalt(10));

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

  if (error) {
    console.error("Technician login account lookup failed:", error.message);
    return new Response(
      JSON.stringify({ error: "Unable to verify login details right now. Please try again." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
  if (!technician) {
    return new Response(
      JSON.stringify({ error: "No account found with this " + (isEmail ? "email" : "mobile number") }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }

  // Only approved technicians may establish a new session. This check must
  // happen before session creation so suspended/rejected accounts cannot log in.
  if (technician.status !== "active") {
    return new Response(
      JSON.stringify({ error: "Your technician account is not active. Please contact support." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
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
  const { error: revokeError } = await supabase.from("technician_auth_sessions").delete().eq("technician_id", technician.id);
  if (revokeError) {
    console.error("Could not revoke prior technician sessions:", revokeError.message);
    return new Response(
      JSON.stringify({ error: "Unable to securely replace the previous login session. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
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

  const safeTech = { ...technician };
  delete (safeTech as typeof technician & { password_hash?: string }).password_hash;
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

  if (sessionError) {
    console.error("Technician KYC admin session lookup failed:", sessionError.message);
    throw new Error("KYC_ADMIN_SESSION_LOOKUP_FAILED");
  }
  if (!session || session.admin_id !== adminId || new Date(session.expires_at).getTime() <= Date.now()) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active")
    .eq("id", adminId)
    .maybeSingle();

  if (error) {
    console.error("Technician KYC admin account lookup failed:", error.message);
    throw new Error("KYC_ADMIN_ACCOUNT_LOOKUP_FAILED");
  }
  if (!data) return null;
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

  let admin: Awaited<ReturnType<typeof requireActiveAdmin>>;
  try {
    admin = await requireActiveAdmin(supabase, admin_id, admin_session_token);
  } catch (error) {
    console.error("Technician KYC admin authorization lookup failed:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: "Unable to validate administrator access right now. Please try again." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
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