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

type Action = "create" | "submit-utr" | "verify" | "status" | "reconcile-legacy";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body?.action as Action;

    if (action === "create") return await createPayment(body);
    if (action === "submit-utr") return await submitUtr(body);
    if (action === "verify") return await verifyPayment(body);
    if (action === "status") return await getPaymentStatus(body);
    if (action === "reconcile-legacy") return await reconcileLegacyPayment(body);

    return json({ error: "Unknown payment action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Payment service error" }, 500);
  }
});

async function createPayment(body: Record<string, unknown>) {
  const payeeType = body.payee_type;
  const payeeId = String(body.payee_id ?? "").replace(/\D/g, "");
  const referenceId = String(body.reference_id ?? "").trim();
  const payeeName = body.payee_name ? String(body.payee_name).trim().slice(0, 120) : null;
  const notes = body.notes ? String(body.notes).trim().slice(0, 300) : null;

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return json({ error: "A valid payment amount is required" }, 400);
  }

  let paymentRow: Record<string, unknown>;

  if (payeeType === "technician" && body.purpose === "registration_fee") {
    if (amount !== 50 || !/^\d{10}$/.test(payeeId) || referenceId !== payeeId) {
      return json({ error: "Only the ₹50 technician registration payment is supported" }, 400);
    }
    paymentRow = {
      payee_type: "technician",
      payee_id: payeeId,
      payee_name: payeeName || "VATTAMS HOME SERVICES",
      upi_id: "venkatesan04051985-7@okhdfcbank",
      amount: 50,
      purpose: "registration_fee",
      reference_id: payeeId,
      status: "pending",
      notes,
    };
  } else if (payeeType === "customer" && body.purpose === "booking") {
    if (!/^\d{10}$/.test(payeeId) || !referenceId) {
      return json({ error: "A valid customer mobile number and booking reference are required" }, 400);
    }

    // Customer payment records can only be created for a real booking belonging
    // to that mobile number, and only for the exact amount stored on the booking.
    const bookingQuery = supabase
      .from("bookings")
      .select("id,booking_number,mobile_number,total_amount,amount");
    const { data: booking, error: bookingError } = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referenceId)
      ? await bookingQuery.eq("id", referenceId).maybeSingle()
      : await bookingQuery.eq("booking_number", referenceId).maybeSingle();

    const bookingAmount = Number(booking?.total_amount ?? booking?.amount);
    if (
      bookingError ||
      !booking ||
      String(booking.mobile_number).replace(/\D/g, "") !== payeeId ||
      !Number.isFinite(bookingAmount) ||
      bookingAmount !== amount
    ) {
      return json({ error: "Booking, customer mobile, or payable amount could not be verified" }, 403);
    }

    paymentRow = {
      payee_type: "customer",
      payee_id: payeeId,
      payee_name: payeeName || null,
      upi_id: "venkatesan04051985-7@okhdfcbank",
      amount,
      purpose: "booking",
      reference_id: String(booking.id),
      status: "pending",
      notes,
    };
  } else {
    return json({ error: "Unsupported payment purpose" }, 400);
  }

  const { data, error } = await supabase.from("payments").insert(paymentRow).select("*").single();
  if (error || !data) return json({ error: "Unable to create payment record" }, 500);
  return json({ payment: data });
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

  const { data: duplicateUtr, error: duplicateUtrError } = await supabase.from("payments")
    .select("payment_id")
    .eq("utr", utr)
    .neq("payment_id", paymentId)
    .limit(1)
    .maybeSingle();
  if (duplicateUtrError) return json({ error: "Unable to validate UTR uniqueness; please retry" }, 500);
  if (duplicateUtr) return json({ error: "This UTR is already linked to another payment" }, 409);

  const { data, error } = await supabase.from("payments")
    .update({ utr, status: "pending" })
    .eq("payment_id", paymentId)
    .eq("payment_action_token", actionToken)
    .eq("status", "pending")
    .select("*").single();

  if (error || !data) return json({ error: "Payment is no longer pending or authorization is invalid" }, 409);
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

  // A payment cannot be marked successful until a UTR has been submitted.
  if (status === "success") verificationQuery = verificationQuery.not("utr", "is", null);

  const { data, error } = await verificationQuery.select("*").single();

  if (error || !data) return json({ error: "Payment must still be pending and, for success, have a submitted UTR" }, 409);
  return json({ payment: data });
}


async function getPaymentStatus(body: Record<string, unknown>) {
  const paymentId = String(body.payment_id ?? "").trim();
  const actionToken = String(body.payment_action_token ?? "").trim();
  if (!paymentId || !actionToken) {
    return json({ error: "Payment ID and payment authorization are required" }, 400);
  }

  const { data, error } = await supabase.from("payments")
    .select("payment_id,payee_type,payee_id,amount,purpose,utr,status,verified_by,verified_at")
    .eq("payment_id", paymentId)
    .eq("payment_action_token", actionToken)
    .maybeSingle();

  if (error || !data) return json({ error: "Payment not found or authorization is invalid" }, 404);
  return json({ payment: data });
}

// Explicit, audited recovery path for legacy ₹49 payments already marked success
// before verification metadata was introduced. This never proves settlement by itself:
// a super-admin must independently reconcile the UTR against bank/UPI evidence.
async function reconcileLegacyPayment(body: Record<string, unknown>) {
  const paymentId = String(body.payment_id ?? "").trim();
  const expectedUtr = String(body.utr ?? "").trim();
  const expectedPayeeId = String(body.technician_mobile ?? "").replace(/\D/g, "");
  const reason = String(body.reconciliation_reason ?? "").trim();
  const adminId = String(body.admin_id ?? "").trim();
  const adminSessionToken = String(body.admin_session_token ?? "").trim();

  if (!paymentId || !expectedUtr || !/^\d{10}$/.test(expectedPayeeId) || reason.length < 20 || !adminId || !adminSessionToken) {
    return json({ error: "Payment ID, matching UTR, matching 10-digit technician mobile, a reconciliation reason (at least 20 characters), and admin authorization are required" }, 400);
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
    return json({ error: "Only an active super-admin can reconcile legacy payments" }, 401);
  }

  const { data: payment, error: lookupError } = await supabase
    .from("payments")
    .select("payment_id,payee_type,payee_id,amount,purpose,utr,status,verified_by,verified_at,notes")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (lookupError || !payment) return json({ error: "Payment not found" }, 404);
  if (
    payment.payee_type !== "technician" ||
    payment.payee_id !== String(body.technician_mobile ?? "").replace(/\D/g, "") ||
    !/^\d{10}$/.test(String(body.technician_mobile ?? "").replace(/\D/g, "")) ||
    String(payment.payee_id ?? "").replace(/\D/g, "") !== expectedPayeeId ||
    Number(payment.amount) !== 49 ||
    payment.purpose !== "registration_fee" ||
    payment.status !== "success" ||
    !payment.utr ||
    payment.utr !== expectedUtr ||
    payment.verified_by ||
    payment.verified_at
  ) {
    return json({ error: "Payment is not eligible for legacy reconciliation; technician mobile, status, amount, purpose, UTR, or verification metadata does not match" }, 409);
  }

  const auditNote = "[Legacy payment reconciliation by super-admin " + adminId + " at " + new Date().toISOString() + "] " + reason;
  const { data, error } = await supabase.from("payments")
    .update({
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      notes: [payment.notes, auditNote].filter(Boolean).join("\n").slice(0, 2000),
    })
    .eq("payment_id", paymentId)
    .eq("status", "success")
    .is("verified_by", null)
    .is("verified_at", null)
    .eq("utr", expectedUtr)
    .select("payment_id,payee_type,payee_id,amount,purpose,utr,status,verified_by,verified_at,notes")
    .maybeSingle();

  if (error || !data) return json({ error: "Payment changed concurrently or could not be reconciled" }, 409);
  return json({ payment: data, message: "Legacy payment metadata recorded. This action must only be used after independent bank/UPI settlement confirmation." });
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
