import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Client-Info,Apikey"};
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

async function session(token:string, table:string){
  const {data}=await db.from(table).select("*").eq("token",token).maybeSingle();
  if(!data || new Date(data.expires_at)<=new Date()) return null;
  return data;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response(null,{status:200,headers:corsHeaders});
  try{
    const b=await req.json();
    const input=b.input||{};
    if(!input.recipientType||!input.recipientId||!input.title||!input.message||!input.type) return out({error:"Notification fields are required"},400);

    let authorized=false;
    const admin=await session(String(b.admin_session_token||""),"admin_auth_sessions");
    if(admin?.admin_id && String(admin.admin_id)===String(b.admin_id||"")) authorized=true;

    if(!authorized){
      const tech=await session(String(b.technician_session_token||""),"technician_auth_sessions");
      if(tech?.technician_id && input.recipientType==="technician" && String(tech.technician_id)===String(input.recipientId)) authorized=true;
    }

    if(!authorized){
      const customer=await session(String(b.customer_session_token||""),"customer_auth_sessions");
      if(customer?.customer_id && input.recipientType==="customer"){
        const {data:c}=await db.from("customers").select("mobile").eq("id",customer.customer_id).single();
        if(c?.mobile && String(c.mobile)===String(input.recipientId)) authorized=true;
      }
    }

    if(!authorized && b.booking_action_token){
      const {data:booking}=await db.from("bookings").select("id,booking_action_token,mobile_number,customer_id,assigned_technician_id").eq("booking_action_token",b.booking_action_token).maybeSingle();
      if(booking && String(booking.booking_action_token)===String(b.booking_action_token)){
        if(input.recipientType==="customer" && String(input.recipientId)===String(booking.mobile_number)) authorized=true;
        if(input.recipientType==="admin" && input.recipientId==="admin") authorized=true;
        if(input.recipientType==="technician" && booking.assigned_technician_id && String(input.recipientId)===String(booking.assigned_technician_id)) authorized=true;
      }
    }

    if(!authorized) return out({error:"Unauthorized"},401);

    const row={recipient_type:input.recipientType,recipient_id:String(input.recipientId),title:String(input.title).slice(0,200),message:String(input.message).slice(0,2000),type:String(input.type).slice(0,100),reference_type:input.referenceType?String(input.referenceType).slice(0,100):null,reference_id:input.referenceId?String(input.referenceId):null,channels:Array.isArray(input.channels)?input.channels:["in_app","push"],status:"sent",is_read:false};
    const {data,error}=await db.from("notifications").insert(row).select("*").single();
    if(error) return out({error:"Unable to create notification"},400);

    if (Array.isArray(row.channels) && row.channels.includes("push") && input.recipientType !== "admin") {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            userType: input.recipientType,
            userId: String(input.recipientId),
            title: String(input.title).slice(0, 200),
            body: String(input.message).slice(0, 2000),
            data: {
              type: String(input.type),
              referenceType: input.referenceType ? String(input.referenceType) : "",
              referenceId: input.referenceId ? String(input.referenceId) : "",
            },
          }),
        });
      } catch {}
    }

    return out({notification:data});
  }catch{return out({error:"Unexpected server error"},500)}
});