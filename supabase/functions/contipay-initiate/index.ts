import { createClient } from "jsr:@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),base=Deno.env.get("CONTIPAY_BASE_URL"),auth=Deno.env.get("CONTIPAY_AUTH"),merchant=Deno.env.get("CONTIPAY_MERCHANT_ID"),app=Deno.env.get("SUFU_APP_URL");
 if(!url||!key||!base||!auth||!merchant||!app)return json({ok:false,error:"server_not_configured"},500);
 const jwt=(req.headers.get("authorization")??"").replace(/^Bearer /,""); if(!jwt)return json({ok:false,error:"unauthorized"},401);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}); const {data:{user}}=await admin.auth.getUser(jwt); if(!user)return json({ok:false,error:"unauthorized"},401);
 const b=await req.json().catch(()=>({})),id=typeof b.payment_intent_id==="string"?b.payment_intent_id:""; const {data:pi}=await admin.from("payment_intents").select("*").eq("id",id).maybeSingle();
 if(!pi)return json({ok:false,error:"payment_intent_not_found"},404); if(pi.payer_id!==user.id)return json({ok:false,error:"forbidden"},403);
 const ref="SUFU-"+id.replaceAll("-","").slice(0,24);
 const r=await fetch(base.replace(/\/$/,"")+"/acquire/payment",{method:"PUT",headers:{"Authorization":"Basic "+auth,"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({currencyCode:String(pi.currency).toUpperCase(),merchantId:Number(merchant),transactions:[{reference:ref,description:"SUFU marketplace payment",amount:Number(pi.amount_minor)/100,webhookUrl:app.replace(/\/$/,"")+"/functions/v1/contipay-result",successUrl:app.replace(/\/$/,"")+"/payment/return?payment_intent="+id,cancelUrl:app.replace(/\/$/,"")+"/payment/return?payment_intent="+id,cod:false,coc:false}]})});
 const data=await r.json().catch(()=>({})); if(!r.ok||String(data.status??"").toLowerCase()==="error")return json({ok:false,error:"contipay_checkout_failed"},502);
 const checkoutUrl=String(data.url??data.redirectUrl??data.paymentUrl??""); if(!checkoutUrl)return json({ok:false,error:"contipay_checkout_url_unavailable"},502);
 await admin.from("payment_intents").update({provider:"contipay",provider_intent_id:ref,provider_checkout_url:checkoutUrl,status:"requires_action",updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,browser_url:checkoutUrl});
});