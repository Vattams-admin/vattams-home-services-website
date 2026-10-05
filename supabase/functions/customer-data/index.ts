import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Client-Info,Apikey"};
const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function auth(token:string){
  const {data}=await supabase.from("customer_auth_sessions").select("customer_id,expires_at").eq("token",token).maybeSingle();
  if(!data || new Date(data.expires_at)<=new Date()) return null;
  return data.customer_id;
}
function out(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response(null,{status:200,headers:corsHeaders});
  try{
    const body=await req.json(); const customerId=await auth(body.session_token||"");
    if(!customerId) return out({error:"Unauthorized"},401);
    switch(body.action){
      case "account":{
        const [{data:customer},{data:bookings},{data:notifications},{data:reviews}]=await Promise.all([
          supabase.from("customers").select("id,full_name,mobile,email,city,address,created_at,updated_at").eq("id",customerId).single(),
          supabase.from("bookings").select("*").eq("customer_id",customerId).order("created_at",{ascending:false}),
          supabase.from("notifications").select("*").eq("recipient_type","customer").eq("recipient_id",body.mobile||"").order("created_at",{ascending:false}).limit(20),
          supabase.from("reviews").select("*").eq("customer_id",customerId).order("created_at",{ascending:false})
        ]);
        return out({customer,bookings:bookings||[],notifications:notifications||[],reviews:reviews||[]});
      }
      case "payments":{
        const {data}=await supabase.from("payments").select("*").eq("payee_type","customer").eq("payee_id",body.mobile||"").order("created_at",{ascending:false});
        return out({payments:data||[]});
      }
      case "bookings":{
        const {data}=await supabase.from("bookings").select("*").eq("customer_id",customerId).order("created_at",{ascending:false});
        return out({bookings:data||[]});
      }
      case "booking_refs":{
        const {data}=await supabase.from("bookings").select("id,service_category,booking_number").eq("customer_id",customerId);
        return out({bookings:data||[]});
      }
      case "profile":{
        const allowed={full_name:body.full_name,email:body.email||null,city:body.city||null,address:body.address||null,updated_at:new Date().toISOString()};
        const {data,error}=await supabase.from("customers").update(allowed).eq("id",customerId).select("id,full_name,mobile,email,city,address,created_at,updated_at").single();
        if(error) return out({error:"Failed to update profile"},400);
        return out({customer:data});
      }
      case "support":{
        const {data:customer}=await supabase.from("customers").select("full_name,mobile").eq("id",customerId).single();
        const {error}=await supabase.from("support_messages").insert({customer_id:customerId,customer_name:customer?.full_name,customer_mobile:customer?.mobile,subject:String(body.subject||"").trim(),message:String(body.message||"").trim(),status:"open"});
        if(error) return out({error:"Failed to send support message"},400);
        return out({success:true});
      }
      default:return out({error:"Invalid action"},400);
    }
  }catch{return out({error:"Unexpected server error"},500)}
});