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
  const payeeId = String(body.payee_id ?? "").trim();
  const payeeName = body.payee_name ? String(body.payee_name) : null;
  const amount = Number(body.amount);
  const purpose = body.purpose;
  const referenceId = body.reference_id ? String(body.reference_id) : null;
  const notes = body.notes ? String(body.notes) : null;

  if (payeeType !== "customer" && payeeType !== "technician") return json({ error: "Invalid payee type" }, 400);
  if (!payeeId || !Number.isFinite(amount) || amount <= 0) return json({ error: "Invalid payment details" }, 400);
  if (!["booking", "registration_fee", "wallet_recharge", "commission"].includes(String(purpose))) {
    return json({ error: "Invalid payment purpose" }, 400);
  }
  if (purpose === "registration_fee" && (payeeType !== "technician" || amount !== 49)) {
    return json({ error: "Technician registration fee must be exactly ₹49" }, 400);
  }

  const { data, error } = await supabase.from("payments").insert({
    payee_type: payeeType,
    payee_id: payeeId,
    payee_name: payeeName,
    upi_id: "venkatesan04051985-7@okhdfcbank",
    amount,
    purpose,
    reference_id: referenceId,
    status: "pending",
    notes,
  }).select("*").single();

  if (error || !data) return json({ error: error?.message || "Unable to create payment record" }, 500);
  return json({ payment: data });
}

async function submitUtr(body: Record<string, unknown>) {
  const paymentId = String(body.payment_id ?? "").trim();
  const utr = String(body.utr ?? "").trim();
  if (!paymentId || utr.length < 6) return json({ error: "Payment ID and valid UTR are required" }, 400);

  const { data: payment, error: readError } = await supabase
    .from("payments").select("payment_id,status").eq("payment_id", paymentId).maybeSingle();

  if (readError || !payment) return json({ error: "Payment record not found" }, 404);
  if (payment.status !== "pending") return json({ error: "Only pending payments can receive UTR confirmation" }, 409);

  const { data, error } = await supabase.from("payments")
    .update({ utr, status: "pending" })
    .eq("payment_id", paymentId)
    .eq("status", "pending")
    .select("*").single();

  if (error || !data) return json({ error: error?.message || "Unable to submit UTR" }, 500);
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

  const { data, error } = await supabase.from("payments")
    .update({
      status,
      verified_by: adminId,
      verified_at: status === "success" ? new Date().toISOString() : null,
    })
    .eq("payment_id", paymentId)
    .eq("status", "pending")
    .select("*").single();

  if (error || !data) return json({ error: error?.message || "Payment is no longer pending or could not be updated" }, 409);
  return json({ payment: data });
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
