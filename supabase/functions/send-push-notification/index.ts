import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

interface PushRequest {
  userType: "customer" | "technician" | "admin";
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFcmAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claims;
  const pem = account.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned),
  ));
  const assertion = unsigned + "." + base64UrlEncode(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || typeof token.access_token !== "string") {
    throw new Error("Unable to obtain Firebase Cloud Messaging access token");
  }
  return token.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    let input: PushRequest;
    try {
      input = await req.json() as PushRequest;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const { userType, userId, title, body, data = {} } = input;
    if (!["customer", "technician", "admin"].includes(userType) ||
        !userId || !title?.trim() || !body?.trim()) {
      return json({ error: "Missing or invalid required fields" }, 400);
    }

    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return json({
        success: false,
        code: "FCM_CREDENTIALS_NOT_CONFIGURED",
        message: "Set the FCM_SERVICE_ACCOUNT_JSON Supabase function secret to enable push delivery.",
      }, 503);
    }

    let account: ServiceAccount;
    try {
      account = JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch {
      return json({ error: "FCM_SERVICE_ACCOUNT_JSON is not valid JSON" }, 503);
    }
    if (!account.project_id || !account.client_email || !account.private_key) {
      return json({ error: "FCM service account is missing required fields" }, 503);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return json({ error: "Supabase URL is not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let tokenQuery = supabase
      .from("fcm_tokens")
      .select("id,token")
      .eq("user_type", userType)
      .eq("is_active", true);
    // Admin announcements use the shared recipient key "admin", while each
    // admin device token is securely stored under that admin's own ID.
    if (userType !== "admin" || userId !== "admin") {
      tokenQuery = tokenQuery.eq("user_id", userId);
    }
    const { data: tokens, error } = await tokenQuery;

    if (error) {
      console.error("[push] token lookup failed", error.message);
      return json({ error: "Unable to load active device tokens" }, 500);
    }
    if (!tokens?.length) return json({ success: true, sent: 0, failed: 0, total: 0, message: "No active tokens" });

    const accessToken = await getFcmAccessToken(account);
    const outcomes = await Promise.all(tokens.map(async (tokenRow: { id: string; token: string }) => {
      const messageData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)]),
      );
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: tokenRow.token,
              notification: { title: title.slice(0, 200), body: body.slice(0, 2000) },
              data: messageData,
              webpush: {
                notification: {
                  title: title.slice(0, 200),
                  body: body.slice(0, 2000),
                  icon: "/logo.svg",
                  badge: "/favicon.svg",
                  requireInteraction: true,
                },
                fcmOptions: { link: new URL(messageData.url || "/", Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net").toString() },
              },
            },
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      const errorCode = result?.error?.details?.find?.(
        (detail: { errorCode?: string }) => detail?.errorCode,
      )?.errorCode ?? result?.error?.status;
      if (!response.ok && ["UNREGISTERED", "NOT_FOUND"].includes(String(errorCode))) {
        await supabase.from("fcm_tokens")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", tokenRow.id);
      }
      if (!response.ok) {
        console.error("[push] FCM delivery failed", { status: response.status, code: errorCode ?? "UNKNOWN" });
      }
      return { ok: response.ok };
    }));

    const sent = outcomes.filter((outcome) => outcome.ok).length;
    const failed = outcomes.length - sent;
    return json({ success: failed === 0, sent, failed, total: outcomes.length }, failed === outcomes.length ? 502 : 200);
  } catch (error) {
    console.error("[push] unexpected delivery error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Push delivery failed" }, 500);
  }
});
