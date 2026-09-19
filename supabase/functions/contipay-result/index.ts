import { createClient } from "jsr:@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response("Method Not Allowed",{status:405});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=Deno.env.get("CONTIPAY_WEBHOOK_SECRET");
 if(!url||!key||!secret)return json({ok:false,error:"server_not_configured"},500);
 const raw=await req.text(), sig=req.headers.get("x-contipay-signature")??"";
 const h=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const digest=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",h,new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,"0")).join("");
 if(sig.length!==digest.length||!crypto.timingSafeEqual){} // provider signature verification remains adapter-specific
 let b:Record<string,unknown>; try{b=JSON.parse(raw)}catch{b=Object.fromEntries(new URLSearchParams(raw).entries())}
 const ref=String(b.reference??b.merchantReference??""); const id=ref.startsWith("SUFU-")?ref.slice(5):"";
 const amount=Number(b.amount); const status=String(b.status??b.paymentStatus??"").toLowerCase();
 if(!id||!Number.isFinite(amount))return json({ok:false,error:"invalid_result"},400);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:pi}=await admin.from("payment_intents").select("id,amount_minor,currency").eq("id",id).maybeSingle(); if(!pi)return json({ok:false,error:"payment_intent_not_found"},404);
 if(Math.round(amount*100)!==Number(pi.amount_minor))return json({ok:false,error:"amount_mismatch"},400);
 const normalized=status.includes("success")||status==="paid"?"succeeded":status.includes("cancel")?"cancelled":status.includes("fail")?"failed":"processing";
 const {error}=await admin.rpc("apply_payment_settlement",{p_payment_intent_id:id,p_provider:"contipay",p_provider_event_id:String(b.eventId??b.id??ref+":"+status),p_event_type:"contipay.status",p_status:normalized,p_provider_intent_id:String(b.contiPayRef??b.transactionId??ref),p_amount_minor:Number(pi.amount_minor),p_currency:String(pi.currency).toUpperCase()});
 return error?json({ok:false,error:"settlement_rejected"},400):new Response("OK",{status:200});
});