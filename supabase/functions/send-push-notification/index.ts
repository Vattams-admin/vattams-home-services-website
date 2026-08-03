import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushRequest {
  userType: 'customer' | 'technician' | 'admin';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userType, userId, title, body, data } = await req.json() as PushRequest;

    if (!userType || !userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_type", userType)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active tokens found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "FCM_SERVER_KEY not configured. In-app notification still created.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.all(
      tokens.map((t: { token: string }) =>
        fetch(`https://fcm.googleapis.com/fcm/send`, {
          method: "POST",
          headers: {
            "Authorization": `key=${fcmServerKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: t.token,
            notification: { title, body, sound: "default", icon: "logo.svg", badge: "favicon.svg" },
            data: data ?? {},
            priority: "high",
            webpush: {
              notification: {
                title,
                body,
                icon: "/logo.svg",
                badge: "/favicon.svg",
                requireInteraction: true,
              },
              fcm_options: { link: data?.url ?? "/" },
            },
          }),
        }),
      ),
    );

    const successCount = results.filter((r) => r.ok).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: tokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
