import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Action = "create" | "submit-utr" | "verify";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
  try {
    const body = await req.json();
    const action = body?.action as Action;

    if (action === "create") return await createPayment(body);
    if (action === "submit-utr") return await submitUtr(body);
    if (action === "verify") return await verifyPayment(body);

    return json({ error: "Unknown payment action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Payment service error" }, 500);
  }
});

async function createPayment(body: Record<string, unknown>) {
  const payeeType = body.payee_type;
  // Validate the original input; stripping non-digits would turn malformed values
  // such as "abc1234567890" into an apparently valid mobile number.
  const payeeId = String(body.payee_id ?? "").trim();
  const referenceId = String(body.reference_id ?? "").trim();
  const payeeName = body.payee_name ? String(body.payee_name).trim().slice(0, 120) : null;
  const notes = body.notes ? String(body.notes).trim().slice(0, 300) : null;

  // This endpoint is currently exposed only for the technician ₹49 joining flow.
  // Do not allow the browser to mint arbitrary booking/wallet/commission payments.
  if (payeeType !== "technician" || body.purpose !== "registration_fee" || Number(body.amount) !== 49) {
    return json({ error: "Only the ₹49 technician registration payment is supported" }, 400);
  }

  if (!/^\d{10}$/.test(payeeId) || referenceId !== payeeId) {
    return json({ error: "A valid technician mobile number is required" }, 400);
  }

  // Fail closed until a trusted SMS/phone-ownership challenge is implemented.
  // Email OTP and the KYC upload capability do not prove control of this mobile.
  // Never create a payable registration row from a caller-supplied phone number.
  return json({ error: "Technician mobile verification is not available yet. Registration payment is temporarily disabled until phone ownership can be verified." }, 503);
}

async function submitUtr(body: Record<string, unknown>) {
  const paymentId = String(body.payment_id ?? "").trim();
  const actionToken = String(body.payment_action_token ?? "").trim();
  const utr = String(body.utr ?? "").trim();

  if (!paymentId || !actionToken || !utr) {
    return json({ error: "Payment ID, payment authorization and UTR are required" }, 400);
  }
  if (!/^[A-Za-z0-9]{6,32}$/.test(utr)) {
    return json({ error: "Invalid UTR format" }, 400);
  }

  const { data, error } = await supabase.from("payments")
    .update({ utr, status: "pending", payment_action_token: crypto.randomUUID() })
    .eq("payment_id", paymentId)
    .eq("payment_action_token", actionToken)
    .eq("status", "pending")
    .select("id,payment_id,payee_type,payee_id,payee_name,upi_id,amount,purpose,reference_id,utr,status,notes,verified_by,created_at,verified_at").single();

  if (error?.code === "23505") {
    return json({ error: "This UTR has already been submitted for another payment" },  409);
  }
  if (error || !data) return json({ error: "Payment is no longer pending or authorization is invalid" }, 409);
  // Rotate the one-time capability on UTR submission; the old token can no
  // longer be replayed and the replacement token is not returned to clients.
  return json({ payment: data });
}

async function verifyPayment(body: Record<string, unknown>) {
  const paymentId = String(body.payment_id ?? "").trim();
  const status = body.status;
  const adminId = String(body.admin_id ?? "").trim();
  const adminSessionToken = String(body.admin_session_token ?? "").trim();

  if (!paymentId || (status !== "success" && status !== "failed") || !adminId || !adminSessionToken) {
    return json({ error: "Payment ID, status and admin authorization are required" }, 400);
  }

  const { data: session, error: sessionError } = await supabase
    .from("admin_auth_sessions")
    .select("admin_id,expires_at")
    .eq("token", adminSessionToken)
    .maybeSingle();

  if (sessionError || !session || session.admin_id !== adminId || new Date(session.expires_at).getTime() <= Date.now()) {
    return json({ error: "Not authorized" }, 401);
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users").select("id,role,is_active").eq("id", adminId).maybeSingle();

  if (adminError || !admin || admin.role !== "super_admin" || admin.is_active !== true) {
    return json({ error: "Not authorized" }, 401);
  }

  let verificationQuery = supabase.from("payments")
    .update({
      status,
      verified_by: adminId,
      verified_at: status === "success" ? new Date().toISOString() : null,
    })
    .eq("payment_id", paymentId)
    .eq("status", "pending");

  // An administrator may approve only a payment with a submitted UTR.
  // A UTR is still not independent bank settlement evidence; the admin must
  // reconcile it before choosing success.
  if (status === "success") verificationQuery = verificationQuery.not("utr", "is", null);

  const { data, error } = await verificationQuery.select("id,payment_id,payee_type,payee_id,payee_name,upi_id,amount,purpose,reference_id,utr,status,notes,verified_by,created_at,verified_at").single();

  if (error || !data) return json({ error: error?.message || "Payment is no longer pending or could not be updated" }, 409);
  return json({ payment: data });
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
