import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Client-Info,Apikey","Cache-Control":"no-store, max-age=0","Pragma":"no-cache","Expires":"0"};
const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function auth(token:string){
  if (typeof token !== "string" || token.length < 16 || token.length > 512) return null;
  const {data}=await supabase.from("customer_auth_sessions").select("customer_id,expires_at").eq("token",token).maybeSingle();
  if(!data || new Date(data.expires_at)<=new Date()) return null;
  return data.customer_id;
}
function sanitizeSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSensitiveFields);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    // These are server-side capabilities/secrets, not customer dashboard data.
    if (["start_otp", "complete_otp", "booking_action_token", "payment_action_token"].includes(key)) continue;
    safe[key] = sanitizeSensitiveFields(item);
  }
  return safe;
}
function out(data:unknown,status=200){return new Response(JSON.stringify(sanitizeSensitiveFields(data)),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
const CUSTOMER_BOOKING_COLUMNS = [
  "id", "booking_number", "customer_name", "mobile_number", "city", "address",
  "service_category", "service_type", "problem_description", "preferred_date",
  "preferred_time", "status", "assigned_technician_id", "amount", "base_price", "gst_amount", "platform_fee",
  "total_amount", "created_at", "updated_at", "job_started_at", "job_completed_at",
  "otp_verification_status", "job_duration_minutes", "coupon_code", "discount_amount",
  "invoice_number", "urgency", "ai_booking",
].join(",");

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response(null,{status:200,headers:corsHeaders});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...corsHeaders,"Content-Type":"application/json","Allow":"POST, OPTIONS"}});
  try{
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return out({error:"Invalid JSON request body"},400);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out({error:"Invalid request body"},400);
    const body = parsed as Record<string, unknown>;
    const customerId=await auth(typeof body.session_token === "string" ? body.session_token : "");
    if(!customerId) return out({error:"Unauthorized"},401);
    switch(body.action){
      case "account":{
        const {data:customer}=await supabase.from("customers").select("id,full_name,mobile,email,city,address,created_at,updated_at").eq("id",customerId).single();if(!customer)return out({error:"Customer not found"},404);const customerMobile=customer.mobile;
        const [{data:bookings},{data:notifications},{data:reviews}]=await Promise.all([
          supabase.from("bookings").select(CUSTOMER_BOOKING_COLUMNS).eq("customer_id",customerId).order("created_at",{ascending:false}),
          supabase.from("notifications").select("id,title,message,created_at,is_read").eq("recipient_type","customer").eq("recipient_id",customerMobile).order("created_at",{ascending:false}).limit(20),
          supabase.from("reviews").select("id,booking_id,rating,review_text,created_at").eq("customer_id",customerId).order("created_at",{ascending:false})
        ]);
        return out({customer,bookings:bookings||[],notifications:notifications||[],reviews:reviews||[]});
      }
      case "payments":{
        const {data:customer}=await supabase.from("customers").select("mobile").eq("id",customerId).single();if(!customer)return out({error:"Customer not found"},404);
        const {data}=await supabase.from("payments").select("id,payment_id,amount,purpose,reference_id,utr,upi_id,status,created_at").eq("payee_type","customer").eq("payee_id",customer.mobile).order("created_at",{ascending:false});
        return out({payments:data||[]});
      }
      case "bookings":{
        const {data}=await supabase.from("bookings").select(CUSTOMER_BOOKING_COLUMNS).eq("customer_id",customerId).order("created_at",{ascending:false});
        return out({bookings:data||[]});
      }
      case "booking_refs":{
        const {data}=await supabase.from("bookings").select("id,service_category,booking_number").eq("customer_id",customerId);
        return out({bookings:data||[]});
      }
      case "confirm_completion":{
        const bookingId = typeof body.booking_id === "string" ? body.booking_id.trim() : "";
        if (!bookingId) return out({error:"Booking ID is required"},400);
        const {data,error}=await supabase.rpc("confirm_booking_completion_atomic",{
          p_booking_id:bookingId,
          p_customer_id:customerId
        });
        if(error){
          const message=String(error.message||"");
          if(message.includes("BOOKING_NOT_FOUND_OR_NOT_OWNED")) return out({error:"Booking not found or not owned by this customer"},404);
          if(message.includes("BOOKING_NOT_AWAITING_CUSTOMER_CONFIRMATION") || message.includes("TECHNICIAN_JOB_NOT_AWAITING_CUSTOMER_CONFIRMATION")) return out({error:"This booking is not awaiting customer confirmation"},409);
          if(message.includes("TECHNICIAN_JOB_NOT_FOUND") || message.includes("COMPLETED_BOOKING_JOB_MISMATCH")) return out({error:"The technician completion record could not be verified"},409);
          return out({error:"Unable to confirm booking completion"},500);
        }
        if(!data?.booking || data.booking.customer_id !== customerId || data.booking.status !== "completed") return out({error:"Completion confirmation could not be verified"},409);
        return out({success:true,booking:data.booking,already_completed:data.already_completed===true});
      }
      case "profile":{
        const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
        const email = body.email == null || body.email === "" ? null : (typeof body.email === "string" ? body.email.trim() : "");
        const city = body.city == null ? null : (typeof body.city === "string" ? body.city.trim() : "");
        const address = body.address == null ? null : (typeof body.address === "string" ? body.address.trim() : "");
        if (fullName.length < 2 || fullName.length > 100) return out({error:"Full name must be between 2 and 100 characters"},400);
        if (email !== null && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return out({error:"A valid email address is required"},400);
        if (city !== null && city.length > 100) return out({error:"City must be 100 characters or fewer"},400);
        if (address !== null && address.length > 500) return out({error:"Address must be 500 characters or fewer"},400);
        if (typeof body.city !== "undefined" && typeof body.city !== "string") return out({error:"City must be text"},400);
        if (typeof body.address !== "undefined" && typeof body.address !== "string") return out({error:"Address must be text"},400);
        const allowed={full_name:fullName,email,city,address,updated_at:new Date().toISOString()};
        const {data,error}=await supabase.from("customers").update(allowed).eq("id",customerId).select("id,full_name,mobile,email,city,address,created_at,updated_at").single();
        if(error) return out({error:"Failed to update profile"},400);
        return out({customer:data});
      }
      case "reviews":{ return out({reviews:(await supabase.from("reviews").select("id,booking_id,rating,review_text,created_at").eq("customer_id",customerId).order("created_at",{ascending:false})).data||[]}); }
      case "completed_bookings":{ return out({bookings:(await supabase.from("bookings").select(CUSTOMER_BOOKING_COLUMNS).eq("customer_id",customerId).eq("status","completed").order("created_at",{ascending:false})).data||[]}); }
      case "notification_read":{if(!body.notification_id)return out({error:"Notification ID is required"},400);const {data:customer}=await supabase.from("customers").select("mobile").eq("id",customerId).single();const {error}=await supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString(),status:"read"}).eq("id",body.notification_id).eq("recipient_type","customer").eq("recipient_id",customer?.mobile||"");if(error)return out({error:"Unable to update notification"},400);return out({success:true});}
      case "notifications_read_all":{const {data:customer}=await supabase.from("customers").select("mobile").eq("id",customerId).single();const {error}=await supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString(),status:"read"}).eq("recipient_type","customer").eq("recipient_id",customer?.mobile||"").eq("is_read",false);if(error)return out({error:"Unable to update notifications"},400);return out({success:true});}
      case "support":{
        const subject = typeof body.subject === "string" ? body.subject.trim() : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (subject.length < 3 || subject.length > 120) return out({error:"Subject must be between 3 and 120 characters"},400);
        if (message.length < 10 || message.length > 5000) return out({error:"Message must be between 10 and 5000 characters"},400);
        const {data:customer}=await supabase.from("customers").select("full_name,mobile").eq("id",customerId).single();
        if (!customer) return out({error:"Customer not found"},404);
        const {error}=await supabase.from("support_messages").insert({customer_id:customerId,customer_name:customer.full_name,customer_mobile:customer.mobile,subject,message,status:"open"});
        if(error) return out({error:"Failed to send support message"},400);
        return out({success:true});
      }
      default:return out({error:"Invalid action"},400);
    }
  }catch{return out({error:"Unexpected server error"},500)}
});