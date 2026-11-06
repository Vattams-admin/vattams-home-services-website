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
  notificationId?: string;
  fcmTokenIds?: string[];
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
    const { userType, userId, title, body, data = {}, notificationId, fcmTokenIds } = input;
    if (!["customer", "technician", "admin"].includes(userType) ||
        typeof userId !== "string" || !userId.trim() ||
        typeof title !== "string" || !title.trim() ||
        typeof body !== "string" || !body.trim() ||
        (notificationId !== undefined && (typeof notificationId !== "string" || !/^[0-9a-f-]{36}$/i.test(notificationId))) ||
        (fcmTokenIds !== undefined && (!Array.isArray(fcmTokenIds) || fcmTokenIds.length === 0 || fcmTokenIds.length > 500 || fcmTokenIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))))) {
      return json({ error: "Missing or invalid required fields" }, 400);
    }
    // Validate optional payload shape before token lookup or dispatch-lease claims.
    // JSON null/arrays/primitives otherwise reach Object.entries(data) after claims.
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return json({ error: "Notification data must be a JSON object" }, 400);
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
    if (fcmTokenIds) tokenQuery = tokenQuery.in("id", fcmTokenIds);
    const { data: tokens, error } = await tokenQuery;

    if (error) {
      console.error("[push] token lookup failed", error.message);
      return json({ error: "Unable to load active device tokens" }, 500);
    }
    if (!tokens?.length) return json({ success: true, sent: 0, failed: 0, total: 0, message: "No active tokens" });

    if (notificationId) {
      const seedRows = tokens.map((tokenRow: { id: string }) => ({
        notification_id: notificationId, fcm_token_id: tokenRow.id, status: "pending",
      }));
      const { error: seedError } = await supabase.from("notification_push_token_deliveries")
        .upsert(seedRows, { onConflict: "notification_id,fcm_token_id", ignoreDuplicates: true });
      if (seedError) {
        console.error("[push] per-device delivery ledger initialization failed", seedError.code);
        return json({ error: "Unable to initialize per-device delivery tracking" }, 500);
      }
    }

    // A previously accepted device must never receive this notification again.
    // This also protects retries after the sender's earlier provider acceptance.
    let eligibleTokens = tokens;
    if (notificationId) {
      const { data: succeededRows, error: succeededLookupError } = await supabase
        .from("notification_push_token_deliveries")
        .select("fcm_token_id")
        .eq("notification_id", notificationId)
        .eq("status", "succeeded");
      if (succeededLookupError) {
        console.error("[push] succeeded-device guard lookup failed", succeededLookupError.code);
        return json({
          success: false,
          sent: 0,
          failed: 0,
          trackingFailures: tokens.length,
          total: tokens.length,
          perDeviceTracking: true,
          error: "Unable to verify prior push delivery state",
        }, 503);
      }
      const succeededIds = new Set((succeededRows || []).map((row: { fcm_token_id: string }) => row.fcm_token_id));
      eligibleTokens = tokens.filter((tokenRow: { id: string }) => !succeededIds.has(tokenRow.id));
    }
    // Atomically reserve each notification/device pair before contacting FCM.
    // Concurrent invocations can only send after one invocation wins this DB claim.
    if (notificationId) {
      const claimResults = await Promise.all(eligibleTokens.map(async (tokenRow: { id: string; token: string }) => {
        const { data: claimed, error: claimError } = await supabase.rpc("claim_notification_push_dispatch", {
          p_notification_id: notificationId,
          p_fcm_token_id: tokenRow.id,
          p_lease_seconds: 180,
        });
        if (claimError) {
          console.error("[push] atomic dispatch claim failed", claimError.code);
          return { tokenRow, error: true, claimed: false };
        }
        return { tokenRow, error: false, claimed: claimed === true };
      }));
      const claimErrors = claimResults.filter((result) => result.error).length;
      if (claimErrors > 0) {
        // Some parallel claims may already have succeeded. Release those exact
        // reservations before returning, otherwise a partial RPC outage blocks
        // those devices until the dispatch lease expires.
        const claimedIds = claimResults
          .filter((result) => result.claimed)
          .map((result) => result.tokenRow.id);
        let releaseFailed = false;
        if (claimedIds.length > 0) {
          const { error: releaseError } = await supabase
            .from("notification_push_token_deliveries")
            .update({ dispatch_lease_until: null, updated_at: new Date().toISOString() })
            .eq("notification_id", notificationId)
            .in("fcm_token_id", claimedIds)
            .in("status", ["pending", "retryable"]);
          if (releaseError) {
            releaseFailed = true;
            console.error("[push] unable to release partial atomic dispatch claims", releaseError.code);
          }
        }
        return json({
          success: false, sent: 0, failed: 0,
          trackingFailures: claimErrors + (releaseFailed ? claimedIds.length : 0),
          total: eligibleTokens.length,
          error: "Unable to acquire atomic push dispatch claims",
        }, 503);
      }
      eligibleTokens = claimResults.filter((result) => result.claimed).map((result) => result.tokenRow);
    }
    if (eligibleTokens.length === 0) {
      return json({
        success: true,
        sent: 0,
        failed: 0,
        trackingFailures: 0,
        total: 0,
        skippedAlreadySucceeded: tokens.length,
        perDeviceTracking: Boolean(notificationId),
      });
    }

    let accessToken: string;
    try {
      accessToken = await getFcmAccessToken(account);
    } catch (error) {
      // No FCM request was made, so release only the dispatch reservations.
      // The retry worker owns attempt counting/backoff when it handles this 503.
      let releaseFailed = false;
      if (notificationId) {
        const { error: releaseError } = await supabase
          .from("notification_push_token_deliveries")
          .update({ dispatch_lease_until: null, updated_at: new Date().toISOString() })
          .eq("notification_id", notificationId)
          .in("fcm_token_id", eligibleTokens.map((tokenRow: { id: string }) => tokenRow.id))
          .in("status", ["pending", "retryable"]);
        if (releaseError) {
          releaseFailed = true;
          console.error("[push] unable to release dispatch claims after FCM auth failure", releaseError.code);
        }
      }
      console.error("[push] FCM access token acquisition failed", error instanceof Error ? error.message : "unknown");
      return json({
        success: false,
        sent: 0,
        failed: 0,
        trackingFailures: releaseFailed ? eligibleTokens.length : 0,
        total: eligibleTokens.length,
        perDeviceTracking: false,
        error: "Unable to initialize FCM delivery",
      }, 503);
    }
    const outcomes = await Promise.all(eligibleTokens.map(async (tokenRow: { id: string; token: string }) => {
      const messageData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)]),
      );
      let response: Response | null = null;
      let networkError: unknown = null;
      try {
        response = await fetch(
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
                  fcm_options: { link: new URL(messageData.url || "/", Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net").toString() },
                },
              },
            }),
          },
        );
      } catch (error) {
        // A transport exception is isolated to this device. Persist it as a
        // retryable outcome rather than rejecting the whole Promise.all batch.
        networkError = error;
        console.error("[push] FCM request transport failed", error instanceof Error ? error.message : "unknown");
      }
      const result = response ? await response.json().catch(() => ({})) : {};
      const errorCode = response
        ? result?.error?.details?.find?.(
          (detail: { errorCode?: string }) => detail?.errorCode,
        )?.errorCode ?? result?.error?.status
        : "FCM_NETWORK_ERROR";
      if (response && !response.ok && ["UNREGISTERED", "NOT_FOUND"].includes(String(errorCode))) {
        await supabase.from("fcm_tokens")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", tokenRow.id);
      }
      const ok = response?.ok === true;
      const attemptAt = new Date();
      let trackingFailed = false;
      if (notificationId) {
        const { data: prior, error: priorError } = await supabase.from("notification_push_token_deliveries")
          .select("attempt_count,status").eq("notification_id", notificationId)
          .eq("fcm_token_id", tokenRow.id).maybeSingle();
        if (priorError || !prior) {
          trackingFailed = true;
          console.error("[push] per-device prior outcome lookup failed", priorError?.code || "ROW_NOT_FOUND");
        } else if (prior.status !== "succeeded") {
          const attempts = Number(prior.attempt_count ?? 0) + 1;
          const terminal = !ok && ["UNREGISTERED", "NOT_FOUND", "INVALID_ARGUMENT", "SENDER_ID_MISMATCH"].includes(String(errorCode));
          const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(attempts - 1, 7)));
          const { error: outcomeError } = await supabase.from("notification_push_token_deliveries")
            .update({
              status: ok ? "succeeded" : terminal || attempts >= 5 ? "terminal" : "retryable",
              attempt_count: attempts,
              next_attempt_at: new Date(attemptAt.getTime() + delaySeconds * 1000).toISOString(),
              lease_until: null,
              dispatch_lease_until: null,
              last_error_code: ok ? null : String(errorCode ?? "FCM_REQUEST_FAILED").slice(0, 120),
              provider_accepted_at: ok ? attemptAt.toISOString() : null,
              last_attempt_at: attemptAt.toISOString(), updated_at: attemptAt.toISOString(),
            })
            .eq("notification_id", notificationId).eq("fcm_token_id", tokenRow.id)
            .neq("status", "succeeded");
          if (outcomeError) {
            trackingFailed = true;
            console.error("[push] per-device outcome persistence failed", outcomeError.code);
          }
        }
      }
      if (!ok) console.error("[push] FCM delivery failed", { status: response?.status ?? 0, code: errorCode ?? (networkError ? "FCM_NETWORK_ERROR" : "UNKNOWN") });
      return { ok, trackingFailed };
    }));

    const sent = outcomes.filter((outcome) => outcome.ok).length;
    const failed = outcomes.filter((outcome) => !outcome.ok).length;
    const trackingFailures = outcomes.filter((outcome) => outcome.trackingFailed).length;
    return json({
      success: failed === 0 && trackingFailures === 0,
      sent,
      failed,
      trackingFailures,
      total: outcomes.length,
      perDeviceTracking: Boolean(notificationId),
    }, trackingFailures > 0 ? 503 : failed === outcomes.length ? 502 : 200);
  } catch (error) {
    console.error("[push] unexpected delivery error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Push delivery failed" }, 500);
  }
});
