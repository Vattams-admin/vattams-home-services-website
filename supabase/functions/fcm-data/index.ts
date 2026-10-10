import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey,X-Client-Info",
};
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function session(table: string, token: string) {
  if (!token) return null;
  const { data } = await db.from(table).select("*").eq("token", token).maybeSingle();
  if (!data || new Date(data.expires_at) <= new Date()) return null;
  return data;
}

async function authorize(userType: string, token: string, adminId: string, requestedId?: string) {
  if (userType === "admin") {
    const s = await session("admin_auth_sessions", token);
    if (!s || String(s.admin_id) !== String(adminId)) return null;
    const { data: a } = await db.from("admin_users").select("id,role,is_active").eq("id", s.admin_id).maybeSingle();
    if (!a?.is_active || a.role !== "super_admin") return null;
    return String(s.admin_id);
  }
  if (userType === "technician") {
    const s = await session("technician_auth_sessions", token);
    if (!s) return null;
    const id = String(s.technician_id || "");
    if (!id || (requestedId && id !== String(requestedId))) return null;
    return id;
  }

  // Customer notifications are addressed by the customer's mobile number throughout
  // the booking and notification flows. Resolve that public recipient key only from
  // the authenticated customer's session; never trust a caller-supplied mobile.
  const s = await session("customer_auth_sessions", token);
  if (!s?.customer_id) return null;
  const { data: customer } = await db.from("customers")
    .select("id,mobile")
    .eq("id", s.customer_id)
    .maybeSingle();
  if (!customer?.mobile) return null;
  const mobile = String(customer.mobile);
  const customerId = String(customer.id);
  if (requestedId && String(requestedId) !== mobile && String(requestedId) !== customerId) return null;
  return mobile;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const b = await req.json();
    const action = String(b.action || "");
    const userType = String(b.user_type || "");
    if (!["customer", "technician", "admin"].includes(userType)) return out({ error: "Invalid user type" }, 400);

    const ownerId = await authorize(userType, String(b.session_token || ""), String(b.admin_id || ""), b.user_id);
    if (!ownerId) return out({ error: "Unauthorized" }, 401);

    if (action === "register") {
      const token = String(b.token || "").trim();
      if (!token || token.length > 4096) return out({ error: "Invalid FCM token" }, 400);
      const deviceInfo = b.device_info == null ? null : String(b.device_info).slice(0, 200);
      const { error } = await db.from("fcm_tokens").upsert({
        user_type: userType,
        user_id: ownerId,
        token,
        device_info: deviceInfo,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_type,user_id,token" });
      if (error) return out({ error: "Unable to register FCM token" }, 400);
      return out({ success: true });
    }

    if (action === "unregister") {
      const token = String(b.token || "").trim();
      if (!token) return out({ error: "FCM token required" }, 400);
      const { error } = await db.from("fcm_tokens").update({
        is_active: false, updated_at: new Date().toISOString(),
      }).eq("user_type", userType).eq("user_id", ownerId).eq("token", token);
      if (error) return out({ error: "Unable to unregister FCM token" }, 400);
      return out({ success: true });
    }

    if (action === "unregister_user") {
      const requested = String(b.user_id || "");
      if (requested && requested !== ownerId) return out({ error: "Unauthorized" }, 401);
      const { error } = await db.from("fcm_tokens").update({
        is_active: false, updated_at: new Date().toISOString(),
      }).eq("user_type", userType).eq("user_id", ownerId);
      if (error) return out({ error: "Unable to unregister FCM tokens" }, 400);
      return out({ success: true });
    }

    if (action === "list") {
      const { data, error } = await db.from("fcm_tokens")
        .select("token")
        .eq("user_type", userType)
        .eq("user_id", ownerId)
        .eq("is_active", true);
      if (error) return out({ error: "Unable to load FCM tokens" }, 500);
      return out({ tokens: data || [] });
    }

    return out({ error: "Unsupported action" }, 400);
  } catch {
    return out({ error: "Unexpected server error" }, 500);
  }
});