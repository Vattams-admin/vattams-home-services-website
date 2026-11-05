import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Client-Info,Apikey"};
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

async function session(token:string, table:string){
  const {data,error}=await db.from(table).select("*").eq("token",token).maybeSingle();
  if(error) return {data:null,error};
  if(!data || !Number.isFinite(new Date(data.expires_at).getTime()) || new Date(data.expires_at)<=new Date()) return {data:null,error:null};
  return {data,error:null};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response(null,{status:200,headers:corsHeaders});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...corsHeaders,"Allow":"POST, OPTIONS"}});
  try{
    const b=await req.json();
    const input=b.input||{};
    if(!input.recipientType||!input.recipientId||!input.title||!input.message||!input.type) return out({error:"Notification fields are required"},400);
    if(input.channels!==undefined && (!Array.isArray(input.channels) || input.channels.length===0 || input.channels.length>2
      || new Set(input.channels).size!==input.channels.length
      || input.channels.some((channel:unknown)=>typeof channel!=="string" || !["in_app","push"].includes(channel)))){
      return out({error:"Unsupported notification channel. Only in_app and push are currently available."},400);
    }

    let authorized=false;
    if(b.admin_session_token){
      const {data:admin,error:adminSessionError}=await session(String(b.admin_session_token),"admin_auth_sessions");
      if(adminSessionError){
        console.error("[notification-ops] admin session lookup failed",{code:adminSessionError.code??null});
        return out({error:"Unable to verify administrator authorization. Please try again."},503);
      }
      if(admin?.admin_id && String(admin.admin_id)===String(b.admin_id||"")){
        const {data:adminUser,error:adminLookupError}=await db.from("admin_users").select("role,is_active").eq("id",admin.admin_id).maybeSingle();
        if(adminLookupError){
          console.error("[notification-ops] admin account lookup failed",{code:adminLookupError.code??null});
          return out({error:"Unable to verify administrator authorization. Please try again."},503);
        }
        if(adminUser?.role==="super_admin" && adminUser.is_active===true) authorized=true;
      }
    }

    if(!authorized){
      if(b.technician_session_token){
        const {data:tech,error:techSessionError}=await session(String(b.technician_session_token),"technician_auth_sessions");
        if(techSessionError){
          console.error("[notification-ops] technician session lookup failed",{code:techSessionError.code??null});
          return out({error:"Unable to verify technician authorization. Please try again."},503);
        }
        if(tech?.technician_id && input.recipientType==="technician" && String(tech.technician_id)===String(input.recipientId)) authorized=true;
      }
    }

    if(!authorized){
      if(b.customer_session_token){
        const {data:customer,error:customerSessionError}=await session(String(b.customer_session_token),"customer_auth_sessions");
        if(customerSessionError){
          console.error("[notification-ops] customer session lookup failed",{code:customerSessionError.code??null});
          return out({error:"Unable to verify customer authorization. Please try again."},503);
        }
        if(customer?.customer_id && input.recipientType==="customer"){
          const {data:c,error:customerLookupError}=await db.from("customers").select("mobile").eq("id",customer.customer_id).maybeSingle();
          if(customerLookupError){
            console.error("[notification-ops] customer account lookup failed",{code:customerLookupError.code??null});
            return out({error:"Unable to verify customer authorization. Please try again."},503);
          }
          if(c?.mobile && String(c.mobile)===String(input.recipientId)) authorized=true;
        }
      }
    }

    if(!authorized && b.booking_action_token){
      const {data:booking,error:bookingLookupError}=await db.from("bookings").select("id,booking_action_token,mobile_number,customer_id,assigned_technician_id").eq("booking_action_token",b.booking_action_token).maybeSingle();
      if(bookingLookupError){
        console.error("[notification-ops] booking capability lookup failed",{code:bookingLookupError.code??null});
        return out({error:"Unable to verify booking authorization. Please try again."},503);
      }
      if(booking && String(booking.booking_action_token)===String(b.booking_action_token)){
        if(input.recipientType==="customer" && input.type==="booking_received" && input.referenceType==="booking" && String(input.referenceId)===String(booking.id) && String(input.recipientId)===String(booking.mobile_number)) authorized=true;
      }
    }

    if(!authorized) return out({error:"Unauthorized"},401);

    const row={recipient_type:input.recipientType,recipient_id:String(input.recipientId),title:String(input.title).slice(0,200),message:String(input.message).slice(0,2000),type:String(input.type).slice(0,100),reference_type:input.referenceType?String(input.referenceType).slice(0,100):null,reference_id:input.referenceId?String(input.referenceId):null,channels:Array.isArray(input.channels)?input.channels:["in_app","push"],status:"sent",is_read:false};
    const {data,error}=await db.rpc("create_notification_with_channel_deliveries",{
      p_recipient_type:row.recipient_type,p_recipient_id:row.recipient_id,p_title:row.title,
      p_message:row.message,p_type:row.type,p_reference_type:row.reference_type,
      p_reference_id:row.reference_id,p_channels:row.channels,
    });
    if(error || !data){
      console.error("[notification-ops] notification and channel ledger creation failed",{code:error?.code??null});
      return out({error:"Unable to create notification. Please try again."},500);
    }

    let pushDelivery: unknown = null;
    if (Array.isArray(row.channels) && row.channels.includes("push")) {
      try {
        const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://vattams.net";
        const destination = input.recipientType === "admin"
          ? "/#/admin-dashboard"
          : input.recipientType === "technician"
            ? "/#/technician-dashboard"
            : "/#/customer-dashboard";
        const pushResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            userType: input.recipientType,
            userId: input.recipientType === "admin" ? "admin" : String(input.recipientId),
            title: String(input.title).slice(0, 200),
            body: String(input.message).slice(0, 2000),
            data: {
              type: String(input.type),
              referenceType: input.referenceType ? String(input.referenceType) : "",
              referenceId: input.referenceId ? String(input.referenceId) : "",
              url: new URL(destination, publicAppUrl).toString(),
            },
          }),
        });
        pushDelivery = await pushResponse.json().catch(() => ({ error: "Invalid push response" }));
        if (!pushResponse.ok) console.error("[notifications] push delivery request failed", { status: pushResponse.status });
      } catch (error) {
        console.error("[notifications] push delivery request failed", error instanceof Error ? error.message : "unknown");
        pushDelivery = { success: false, error: "Push delivery request failed" };
      }
    }

    let deliveryTrackingError = false;
    if (row.channels.includes("push")) {
      const result = pushDelivery && typeof pushDelivery === "object"
        ? pushDelivery as Record<string, unknown>
        : {};
      const sent = Number.isInteger(result.sent) ? Number(result.sent) : 0;
      const failed = Number.isInteger(result.failed) ? Number(result.failed) : 0;
      const hasCounts = Number.isInteger(result.sent) && Number.isInteger(result.failed) && Number.isInteger(result.total);
      const total = hasCounts ? Number(result.total) : 0;
      const deliveryStatus = hasCounts && total === 0
        ? "skipped"
        : !hasCounts
          ? "failed"
        : sent > 0 && failed > 0
          ? "partial"
          : failed > 0
            ? "failed"
            : sent > 0
              ? "succeeded"
              : "failed";
      const errorCode = hasCounts && total === 0
        ? "NO_ACTIVE_TOKENS"
        : !hasCounts
          ? "PUSH_RESPONSE_MISSING_COUNTS"
        : deliveryStatus === "failed" || deliveryStatus === "partial"
          ? "PUSH_DELIVERY_INCOMPLETE"
          : null;
      const { error: deliveryUpdateError } = await db
        .from("notification_channel_deliveries")
        .update({
          status: deliveryStatus,
          attempt_count: 1,
          delivered_count: sent,
          failed_count: failed,
          error_code: errorCode,
          provider_accepted_at: sent > 0 ? new Date().toISOString() : null,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("notification_id", data.id)
        .eq("channel", "push");
      if (deliveryUpdateError) {
        deliveryTrackingError = true;
        console.error("[notification-ops] push delivery outcome persistence failed", { code: deliveryUpdateError.code ?? null });
      }
    }

    return out({ notification: data, pushDelivery, deliveryTracking: "per_channel", deliveryTrackingError });
  }catch{return out({error:"Unexpected server error"},500)}
});