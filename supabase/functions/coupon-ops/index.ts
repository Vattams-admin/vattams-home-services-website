import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,Authorization,Apikey","Content-Type":"application/json"};
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response(null,{headers});
 try{
  const {action,coupon_id,booking_id,customer_id,discount_amount}=await req.json();
  if(action!=="redeem") return new Response(JSON.stringify({error:"Unsupported action"}),{status:400,headers});
  if(!coupon_id||!booking_id||!Number.isFinite(Number(discount_amount))||Number(discount_amount)<0)return new Response(JSON.stringify({error:"Invalid redemption"}),{status:400,headers});
  const {data:booking}=await db.from("bookings").select("id,total_amount,amount,coupon_code,discount_amount,customer_id").eq("id",booking_id).maybeSingle();
  if(!booking)return new Response(JSON.stringify({error:"Booking not found"}),{status:404,headers});
  if(!booking.coupon_code)return new Response(JSON.stringify({error:"Booking has no coupon"}),{status:400,headers});
  const {data:coupon}=await db.from("coupons").select("*").eq("id",coupon_id).eq("is_active",true).maybeSingle();
  if(!coupon)return new Response(JSON.stringify({error:"Coupon unavailable"}),{status:400,headers});
  if(String(coupon.code).toUpperCase()!==String(booking.coupon_code).toUpperCase())return new Response(JSON.stringify({error:"Coupon does not match booking"}),{status:400,headers});
  if(Math.abs(Number(booking.discount_amount||0)-Number(discount_amount))>0.01)return new Response(JSON.stringify({error:"Discount does not match booking"}),{status:400,headers});
  if(coupon.valid_from&&new Date(coupon.valid_from)>new Date())return new Response(JSON.stringify({error:"Coupon not active"}),{status:400,headers});
  if(coupon.valid_until&&new Date(coupon.valid_until)<new Date())return new Response(JSON.stringify({error:"Coupon expired"}),{status:400,headers});
  if(coupon.max_uses!==null&&coupon.used_count>=coupon.max_uses)return new Response(JSON.stringify({error:"Coupon usage limit reached"}),{status:400,headers});
  if(Number(discount_amount)>Number(booking.total_amount??booking.amount??0))return new Response(JSON.stringify({error:"Invalid discount"}),{status:400,headers});
  const {error:redeemError}=await db.from("coupon_redemptions").insert({coupon_id,booking_id,customer_id:booking.customer_id||null,discount_amount:Number(discount_amount)});
  if(redeemError)return new Response(JSON.stringify({error:"Coupon already redeemed or unavailable"}),{status:400,headers});
  const {error:updateError}=await db.rpc("increment_coupon_usage",{coupon_id});
  if(updateError)return new Response(JSON.stringify({error:"Unable to finalize coupon usage"}),{status:500,headers});
  return new Response(JSON.stringify({success:true}),{headers});
 }catch{return new Response(JSON.stringify({error:"Unexpected server error"}),{status:500,headers})}
});