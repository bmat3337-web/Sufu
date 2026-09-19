import { createClient } from "jsr:@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), base=Deno.env.get("ZIMSWITCH_BASE_URL"), entity=Deno.env.get("ZIMSWITCH_ENTITY_ID"), token=Deno.env.get("ZIMSWITCH_ACCESS_TOKEN"), app=Deno.env.get("SUFU_APP_URL");
 if(!url||!key||!base||!entity||!token||!app)return json({ok:false,error:"server_not_configured"},500);
 const auth=req.headers.get("authorization")??"",jwt=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!jwt)return json({ok:false,error:"unauthorized"},401);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:ae}=await admin.auth.getUser(jwt); if(ae||!user)return json({ok:false,error:"unauthorized"},401);
 const body=await req.json().catch(()=>({})); const id=typeof body.payment_intent_id==="string"?body.payment_intent_id:"";
 const {data:pi,error}=await admin.from("payment_intents").select("*").eq("id",id).maybeSingle();
 if(error||!pi)return json({ok:false,error:"payment_intent_not_found"},404);
 if(pi.payer_id!==user.id)return json({ok:false,error:"forbidden"},403);
 if(!["pending","requires_action","processing"].includes(pi.status))return json({ok:false,error:"payment_not_initiatable"},409);
 const ref="SUFU-"+id.replaceAll("-","").slice(0,24);
 const shopperResultUrl=app.replace(/\/$/,"")+"/payment/return?payment_intent="+encodeURIComponent(id);
 const res=await fetch(base.replace(/\/$/,"")+"/v1/checkouts",{method:"POST",headers:{"Authorization":"Bearer "+token,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({entityId:entity,amount:(Number(pi.amount_minor)/100).toFixed(2),currency:String(pi.currency).toUpperCase(),paymentType:"DB",merchantTransactionId:ref}).toString()});
 const data=await res.json().catch(()=>({})); if(!res.ok||!data.id)return json({ok:false,error:"zimswitch_checkout_failed"},502);
 await admin.from("payment_intents").update({provider:"zimswitch",provider_intent_id:String(data.id),provider_checkout_url:base.replace(/\/$/,"")+"/v1/paymentWidgets.js?checkoutId="+encodeURIComponent(String(data.id)),provider_poll_url:String(data.resourcePath??""),status:"requires_action",updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,checkout_id:String(data.id),checkout_url:base.replace(/\/$/,"")+"/v1/paymentWidgets.js?checkoutId="+encodeURIComponent(String(data.id)),shopper_result_url:shopperResultUrl});
});