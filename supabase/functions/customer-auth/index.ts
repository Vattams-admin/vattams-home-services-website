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

function generateOTP(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function validateMobile(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length !== 10) return "Mobile number must be exactly 10 digits";
  if (!/^[6-9]/.test(digits)) return "Mobile number must start with 6, 7, 8, or 9";
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    switch (action) {
      case "logout": {
        const { session_token } = body;
        if (!session_token) return errorResponse("Secure login session is required", 401);
        await supabase.from("customer_auth_sessions").delete().eq("token", session_token);
        return jsonResponse({ success: true, message: "Logged out successfully" });
      }

      case "register": {
        const { full_name, mobile, password, email, city, address } = body;

        if (!full_name?.trim()) return errorResponse("Full name is required");
        if (!mobile?.trim()) return errorResponse("Mobile number is required");
        if (!password?.trim()) return errorResponse("Password is required");

        const mobileErr = validateMobile(mobile);
        if (mobileErr) return errorResponse(mobileErr);
        const passErr = validatePassword(password);
        if (passErr) return errorResponse(passErr);

        // Check if customer already exists
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("mobile", mobile)
          .maybeSingle();

        if (existing) return errorResponse("An account with this mobile number already exists");

        if (email) {
          const { data: existingEmail } = await supabase
            .from("customers")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (existingEmail) return errorResponse("An account with this email already exists");
        }

        // Generate and store OTP
        const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOtp } = await supabase.from("otp_codes").select("id").eq("mobile", mobile).eq("purpose", "registration").gte("created_at", recentCutoff).limit(1).maybeSingle();
        if (recentOtp) return errorResponse("Please wait 60 seconds before requesting another OTP.", 429);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Delete old OTPs for this mobile + purpose
        await supabase.from("otp_codes").delete().eq("mobile", mobile).eq("purpose", "registration");

        const { error: otpError } = await supabase.from("otp_codes").insert({
          mobile,
          code: otp,
          purpose: "registration",
          expires_at: expiresAt,
        });

        if (otpError) return errorResponse("Failed to generate OTP. Please try again.");

        const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        const { error: pendingError } = await supabase.from("otp_codes").update({
          registration_data: {
            full_name: String(full_name).trim(),
            mobile,
            password_hash: passwordHash,
            email: email || null,
            city: city || null,
            address: address || null,
          },
        }).eq("mobile", mobile).eq("purpose", "registration").eq("code", otp);
        if (pendingError) return errorResponse("Failed to prepare registration. Please try again.", 500);

        return jsonResponse({ success: true, message: "OTP sent successfully" });
      }

      case "verify-otp": {
        const { mobile, code, purpose, registration_data } = body;

        if (!mobile || !code) return errorResponse("Mobile and OTP code are required");
        if (!purpose || !["registration", "forgot_password"].includes(String(purpose))) return errorResponse("Invalid OTP purpose");

        // Find the latest unverified, unexpired OTP
        const { data: otpRecord } = await supabase
          .from("otp_codes")
          .select("*")
          .eq("mobile", mobile)
          .eq("purpose", purpose)
          .eq("verified", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!otpRecord) return errorResponse("Invalid OTP code");
        if (Number(otpRecord.attempt_count || 0) >= 5) return errorResponse("Too many incorrect OTP attempts. Please request a new OTP.", 429);

        if (new Date(otpRecord.expires_at) < new Date()) {
          return errorResponse("OTP has expired. Please request a new one.");
        }

        if (String(otpRecord.code) !== String(code)) {
          const nextAttempts = Number(otpRecord.attempt_count || 0) + 1;
          await supabase.from("otp_codes").update({ attempt_count: nextAttempts }).eq("id", otpRecord.id).eq("verified", false);
          return errorResponse(nextAttempts >= 5 ? "Too many incorrect OTP attempts. Please request a new OTP." : "Invalid OTP code", nextAttempts >= 5 ? 429 : 400);
        }

        // Mark OTP as verified atomically; a verified OTP cannot be reused.
        const { data: consumedOtp, error: consumeError } = await supabase.from("otp_codes").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", otpRecord.id).eq("verified", false).select("id").maybeSingle();
        if (consumeError || !consumedOtp) return errorResponse("OTP is no longer valid. Please request a new OTP.", 409);

        // If registration, create the customer account
        if (purpose === "registration") {
          const pending = (otpRecord as { registration_data?: Record<string, unknown> }).registration_data;
          if (!pending) return errorResponse("Registration session expired. Please register again.");
          const { full_name, mobile: regMobile, password_hash, email, city, address } = pending;
          if (String(regMobile).replace(/\D/g, "") !== String(mobile).replace(/\D/g, "")) {
            return errorResponse("Registration mobile does not match the verified OTP");
          }
          if (!String(full_name || "").trim() || !String(password_hash || "").trim()) {
            return errorResponse("Valid registration details are required");
          }

          // Double-check no duplicate created in the meantime
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("mobile", regMobile)
            .maybeSingle();

          if (existing) return errorResponse("Account already exists with this mobile number");

          const { data: customer, error: insertError } = await supabase
            .from("customers")
            .insert({
              full_name,
              mobile: regMobile,
              email: email || null,
              password_hash: String(password_hash),
              city: city || null,
              address: address || null,
            })
            .select("id, full_name, mobile, email, city, address, created_at")
            .single();

          if (insertError) {
            return errorResponse("Failed to create account. Please try again.");
          }

          return jsonResponse({ success: true, message: "Account created successfully", customer });
        }

        // If forgot_password, just confirm verification (client will call reset-password)
        if (purpose === "forgot_password") {
          return jsonResponse({ success: true, message: "OTP verified. You can now reset your password." });
        }

        return jsonResponse({ success: true, message: "OTP verified successfully" });
      }

      case "login": {
        const { mobile, password } = body;

        if (!mobile?.trim()) return errorResponse("Mobile number is required");
        if (!password?.trim()) return errorResponse("Password is required");

        const mobileErr = validateMobile(mobile);
        if (mobileErr) return errorResponse(mobileErr);

        const { data: customer, error } = await supabase
          .from("customers")
          .select("id, full_name, mobile, email, city, address, password_hash, created_at")
          .eq("mobile", mobile)
          .maybeSingle();

        if (error || !customer) return errorResponse("Invalid mobile number or password");

        const passwordMatch = bcrypt.compareSync(password, customer.password_hash);
        if (!passwordMatch) return errorResponse("Invalid mobile number or password");

        // Mint an opaque server-side session. The browser never uses the customer id as proof of identity.
        const sessionToken = crypto.randomUUID() + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("customer_auth_sessions").delete().eq("customer_id", customer.id);
        const { error: sessionError } = await supabase.from("customer_auth_sessions").insert({
          customer_id: customer.id,
          token: sessionToken,
          expires_at: expiresAt,
        });
        if (sessionError) return errorResponse("Unable to create secure login session. Please try again.", 500);

        const { password_hash, ...customerData } = customer;
        return jsonResponse({
          success: true,
          message: "Login successful",
          customer: customerData,
          sessionToken,
          expiresAt,
        });
      }

      case "forgot-password": {
        const { mobile } = body;

        if (!mobile?.trim()) return errorResponse("Mobile number is required");

        const mobileErr = validateMobile(mobile);
        if (mobileErr) return errorResponse(mobileErr);

        // Check if customer exists
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("mobile", mobile)
          .maybeSingle();

        if (!customer) return errorResponse("No account found with this mobile number");

        // Generate and store OTP
        const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOtp } = await supabase.from("otp_codes").select("id").eq("mobile", mobile).eq("purpose", "forgot_password").gte("created_at", recentCutoff).limit(1).maybeSingle();
        if (recentOtp) return errorResponse("Please wait 60 seconds before requesting another OTP.", 429);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from("otp_codes").delete().eq("mobile", mobile).eq("purpose", "forgot_password");

        const { error: otpError } = await supabase.from("otp_codes").insert({
          mobile,
          code: otp,
          purpose: "forgot_password",
          expires_at: expiresAt,
        });

        if (otpError) return errorResponse("Failed to generate OTP. Please try again.");

        return jsonResponse({
          success: true,
          message: "OTP sent successfully",
        });
      }

      case "reset-password": {
        const { mobile, new_password } = body;

        if (!mobile?.trim()) return errorResponse("Mobile number is required");
        if (!new_password?.trim()) return errorResponse("New password is required");

        const passErr = validatePassword(new_password);
        if (passErr) return errorResponse(passErr);

        // A verified OTP is a one-time password-reset capability. Bind the
        // reset to the same mobile and consume the capability after success.
        const { data: otpRecord } = await supabase
          .from("otp_codes")
          .select("id,mobile,created_at,expires_at,verified")
          .eq("mobile", mobile)
          .eq("purpose", "forgot_password")
          .eq("verified", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!otpRecord) return errorResponse("Please verify your OTP first");

        // Check OTP not expired (verified within last 30 minutes)
        const otpAge = Date.now() - new Date(otpRecord.created_at).getTime();
        if (otpAge > 30 * 60 * 1000) {
          return errorResponse("Verification expired. Please request a new OTP.");
        }

        const { data: resetCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("mobile", mobile)
          .maybeSingle();
        if (!resetCustomer) return errorResponse("No account found with this mobile number");

        // Update password
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(new_password, salt);

        const { error: updateError } = await supabase
          .from("customers")
          .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
          .eq("id", resetCustomer.id);

        if (updateError) return errorResponse("Failed to reset password. Please try again.");

        // Delete used OTP
        await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

        return jsonResponse({ success: true, message: "Password reset successfully" });
      }

      case "change-password": {
        const { current_password, new_password, session_token } = body;
        if (!session_token) return errorResponse("Secure login session is required", 401);
        const { data: session } = await supabase.from("customer_auth_sessions").select("customer_id,expires_at").eq("token", session_token).maybeSingle();
        if (!session || new Date(session.expires_at) <= new Date()) return errorResponse("Session expired. Please log in again.", 401);
        const { data: sessionCustomer } = await supabase.from("customers").select("id,mobile,password_hash").eq("id", session.customer_id).maybeSingle();
        if (!sessionCustomer) return errorResponse("Account not found", 404);
        if (!current_password?.trim()) return errorResponse("Current password is required");
        if (!new_password?.trim()) return errorResponse("New password is required");

        const passErr = validatePassword(new_password);
        if (passErr) return errorResponse(passErr);

        const customer = sessionCustomer;
        const passwordMatch = bcrypt.compareSync(current_password, customer.password_hash);
        if (!passwordMatch) return errorResponse("Current password is incorrect");

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(new_password, salt);

        const { error: updateError } = await supabase
          .from("customers")
          .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
          .eq("id", customer.id);

        if (updateError) return errorResponse("Failed to change password. Please try again.");

        return jsonResponse({ success: true, message: "Password changed successfully" });
      }

      case "submit-review": {
        const { booking_id, customer_id, customer_name, technician_id, rating, review_text, session_token } = body;
        const { data: session } = await supabase.from("customer_auth_sessions").select("customer_id,expires_at").eq("token", session_token || "").maybeSingle();
        if (!session || new Date(session.expires_at) <= new Date() || session.customer_id !== customer_id) return errorResponse("Unauthorized", 401);
        const { data: reviewCustomer } = await supabase.from("customers").select("id,full_name").eq("id", session.customer_id).maybeSingle();
        if (!reviewCustomer) return errorResponse("Customer account not found", 404);

        if (!booking_id) return errorResponse("Booking ID is required");
        if (!customer_id) return errorResponse("Customer ID is required");
        if (!rating || rating < 1 || rating > 5) return errorResponse("Rating must be between 1 and 5");

        // Check if review already exists
        const { data: existing } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", booking_id)
          .maybeSingle();

        if (existing) return errorResponse("You have already reviewed this booking");

        // Verify the booking belongs to this customer and is completed
        const { data: booking } = await supabase
          .from("bookings")
          .select("id, status, customer_id, assigned_technician_id")
          .eq("id", booking_id)
          .maybeSingle();

        if (!booking) return errorResponse("Booking not found");
        if (booking.customer_id !== customer_id) return errorResponse("You are not authorized to review this booking", 403);
        if (booking.status !== "completed") return errorResponse("You can only review completed bookings");

        const finalTechId = technician_id || booking.assigned_technician_id;

        const { data: review, error: reviewError } = await supabase
          .from("reviews")
          .insert({
            booking_id,
            customer_id,
            customer_name: reviewCustomer.full_name,
            technician_id: finalTechId || null,
            rating,
            review_text: review_text || null,
          })
          .select("*")
          .single();

        if (reviewError) return errorResponse("Failed to submit review. Please try again.");

        // Update technician rating
        if (finalTechId) {
          const { data: avgData } = await supabase
            .from("reviews")
            .select("rating")
            .eq("technician_id", finalTechId);

          if (avgData && avgData.length > 0) {
            const avgRating = avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length;
            await supabase
              .from("technicians")
              .update({ rating: Math.round(avgRating * 100) / 100 })
              .eq("id", finalTechId);
          }
        }

        return jsonResponse({ success: true, message: "Review submitted successfully", review });
      }

      case "resend-otp": {
        const { mobile, purpose } = body;

        if (!mobile?.trim()) return errorResponse("Mobile number is required");
        if (!purpose || !["registration", "forgot_password"].includes(String(purpose))) return errorResponse("Invalid OTP purpose");

        const mobileErr = validateMobile(mobile);
        if (mobileErr) return errorResponse(mobileErr);

        // Resend only for a valid flow. Existing account state is checked for
        // password recovery; registration is rejected if the account exists.
        if (purpose === "forgot_password") {
          const { data: account } = await supabase.from("customers").select("id").eq("mobile", mobile).maybeSingle();
          if (!account) return errorResponse("No account found with this mobile number");
        }

        const recentCutoff = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOtp } = await supabase.from("otp_codes").select("id").eq("mobile", mobile).eq("purpose", purpose).gte("created_at", recentCutoff).limit(1).maybeSingle();
        if (recentOtp) return errorResponse("Please wait 60 seconds before requesting another OTP.", 429);

        // Delete old OTPs
        await supabase.from("otp_codes").delete().eq("mobile", mobile).eq("purpose", purpose);

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { error: otpError } = await supabase.from("otp_codes").insert({
          mobile,
          code: otp,
          purpose,
          expires_at: expiresAt,
        });

        if (otpError) return errorResponse("Failed to generate OTP. Please try again.");

        return jsonResponse({
          success: true,
          message: "OTP resent successfully",
        });
      }

      default:
        return errorResponse("Invalid action");
    }
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
