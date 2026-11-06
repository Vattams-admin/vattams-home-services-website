import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey,X-Client-Info",
};
const out = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface RetryClaim {
  delivery_id: string;
  lease_until: string;
  notification_id: string;
  fcm_token_id: string;
  recipient_type: "customer" | "technician" | "admin";
  recipient_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_type: string | null;
  reference_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!serviceRoleKey || !supabaseUrl || req.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
    return out({ error: "Unauthorized" }, 401);
  }

  try {
    const input = await req.json().catch(() => ({}));
    const limit = Number.isInteger(input?.limit) ? Math.min(100, Math.max(1, input.limit)) : 50;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: claims, error } = await supabase.rpc("claim_notification_push_retries", {
      p_limit: limit,
      p_lease_seconds: 120,
      p_max_attempts: 5,
    });
    if (error) {
      console.error("[notification-push-retry] claim failed", error.code);
      return out({ error: "Unable to claim push retries" }, 500);
    }

    const deferClaim = async (deliveryId: string, leaseUntil: string): Promise<boolean> => {
      const { data: deferred, error: deferError } = await supabase.rpc("defer_notification_push_retry", {
        p_delivery_id: deliveryId,
        p_expected_lease_until: leaseUntil,
      });
      if (deferError) {
        console.error("[notification-push-retry] unable to release deferred claim", {
          deliveryId,
          code: deferError.code,
        });
        return false;
      }
      return deferred === true;
    };

    const results = await Promise.all((claims || []).map(async (claim: RetryClaim) => {
      const destination = claim.recipient_type === "admin"
        ? "/#/admin-dashboard"
        : claim.recipient_type === "technician"
          ? "/#/technician-dashboard"
          : "/#/customer-dashboard";
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userType: claim.recipient_type,
            userId: claim.recipient_type === "admin" ? "admin" : claim.recipient_id,
            notificationId: claim.notification_id,
            fcmTokenIds: [claim.fcm_token_id],
            title: claim.title,
            body: claim.message,
            data: {
              type: claim.notification_type,
              referenceType: claim.reference_type || "",
              referenceId: claim.reference_id || "",
              url: new URL(destination, Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net").toString(),
            },
          }),
        });
        const payload = await response.json().catch(() => ({}));
        // An inactive/deleted FCM token is not a transient dispatch failure.
        // The sender returns this success response when the requested token is
        // no longer active; terminalize the ledger row instead of retrying it.
        if (response.ok && payload?.message === "No active tokens") {
          const { data: terminalizeResult, error: terminalizeError } = await supabase.rpc("terminalize_notification_push_retry", {
            p_delivery_id: claim.delivery_id,
            p_expected_lease_until: claim.lease_until,
          });
          const terminalized = !terminalizeError && terminalizeResult === true;
          if (!terminalized) {
            console.error("[notification-push-retry] unable to terminalize inactive token", {
              deliveryId: claim.delivery_id,
              code: terminalizeError?.code || "CLAIM_LEASE_NOT_CURRENT",
            });
          }
          return {
            deliveryId: claim.delivery_id,
            trackedBySender: false,
            senderAccepted: true,
            providerFailures: 0,
            status: response.status,
            terminalized,
            deferSucceeded: terminalizeError ? false : null,
          };
        }
        // A different sender still owns the device dispatch lease. Do not
        // defer this retry: clearing that lease could permit a duplicate FCM send.
        if (payload?.inFlight === true) {
          return {
            deliveryId: claim.delivery_id,
            trackedBySender: false,
            senderAccepted: false,
            providerFailures: 0,
            inFlight: true,
            status: response.status,
            deferSucceeded: null,
          };
        }
        if (payload?.perDeviceTracking !== true) {
          const deferSucceeded = await deferClaim(claim.delivery_id, claim.lease_until);
          return {
            deliveryId: claim.delivery_id,
            trackedBySender: false,
            senderAccepted: false,
            providerFailures: 0,
            status: response.status,
            deferSucceeded,
          };
        }
        // The sender returns HTTP 200 for partial FCM success. Inspect its
        // per-device result as well, otherwise scheduler monitoring hides
        // failed devices even though those rows were correctly made retryable.
        const providerFailures = Number.isInteger(payload?.failed) && payload.failed >= 0
          ? payload.failed
          : 1;
        const trackingFailures = Number.isInteger(payload?.trackingFailures) && payload.trackingFailures >= 0
          ? payload.trackingFailures
          : 0;
        return {
          deliveryId: claim.delivery_id,
          trackedBySender: true,
          senderAccepted: response.ok,
          providerFailures,
          trackingFailures,
          status: response.status,
          deferSucceeded: null,
        };
      } catch {
        const deferSucceeded = await deferClaim(claim.delivery_id, claim.lease_until);
        return {
          deliveryId: claim.delivery_id,
          trackedBySender: false,
          senderAccepted: false,
          providerFailures: 0,
          status: 0,
          deferSucceeded,
        };
      }
    }));

    const deferFailures = results.filter((item) => item.deferSucceeded === false).length;
    const inFlight = results.filter((item) => item.inFlight === true).length;
    const terminalized = results.filter((item) => item.terminalized === true).length;
    const terminalizationFailures = results.filter((item) => item.terminalized === false).length;
    const senderFailures = results.filter((item) => item.trackedBySender && !item.senderAccepted).length;
    const providerFailures = results.reduce((total, item) => total + (item.providerFailures || 0), 0);
    const trackingFailures = results.reduce((total, item) => total + (item.trackingFailures || 0), 0);
    return out({
      claimed: (claims || []).length,
      tracked: results.filter((item) => item.trackedBySender).length,
      senderFailures,
      providerFailures,
      trackingFailures,
      deferred: results.filter((item) => item.deferSucceeded === true).length,
      terminalized,
      terminalizationFailures,
      deferFailures,
      inFlight,
      results,
    }, deferFailures > 0 || terminalizationFailures > 0 || inFlight > 0 ? 500 : providerFailures > 0 || trackingFailures > 0 || senderFailures > 0 ? 502 : 200);
  } catch (error) {
    console.error("[notification-push-retry] unexpected failure", error instanceof Error ? error.message : "unknown");
    return out({ error: "Unexpected retry worker failure" }, 500);
  }
});
