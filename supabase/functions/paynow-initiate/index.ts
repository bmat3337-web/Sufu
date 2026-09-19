import { createClient } from "jsr:@supabase/supabase-js@2";

const PAYNOW_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
});

async function sha512Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hashValues(values: string[], integrationKey: string) {
  return sha512Hex(values.join("") + integrationKey);
}

function parsePaynowMessage(text: string): Record<string, string> {
  const params = new URLSearchParams(text);
  return Object.fromEntries(Array.from(params.entries()).map(([k, v]) => [k.toLowerCase(), v]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
  const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
  const appUrl = Deno.env.get("SUFU_APP_URL");
  if (!url || !serviceRole || !integrationId || !integrationKey || !appUrl) {
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ ok: false, error: "unauthorized" }, 401);

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return json({ ok: false, error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const paymentIntentId = typeof body.payment_intent_id === "string" ? body.payment_intent_id : "";
  if (!paymentIntentId) return json({ ok: false, error: "missing_payment_intent_id" }, 400);

  const { data: pi, error: piError } = await admin.from("payment_intents").select("*").eq("id", paymentIntentId).maybeSingle();
  if (piError || !pi) return json({ ok: false, error: "payment_intent_not_found" }, 404);
  if (pi.payer_id !== user.id) return json({ ok: false, error: "forbidden" }, 403);
  if (!["pending", "requires_action", "processing"].includes(pi.status)) {
    return json({ ok: false, error: "payment_not_initiatable" }, 409);
  }
  if (String(pi.currency).toUpperCase() !== "USD") {
    return json({ ok: false, error: "paynow_usd_only_for_this_adapter" }, 400);
  }

  const reference = "SUFU-" + paymentIntentId.replaceAll("-", "").slice(0, 24);
  const returnUrl = appUrl.replace(/\/$/, "") + "/payment/return?payment_intent=" + encodeURIComponent(paymentIntentId);
  const resultUrl = appUrl.replace(/\/$/, "") + "/functions/v1/paynow-result";

  const fields: Record<string, string> = {
    id: integrationId,
    reference,
    amount: (Number(pi.amount_minor) / 100).toFixed(2),
    additionalinfo: "SUFU marketplace payment " + reference,
    returnurl: returnUrl,
    resulturl: resultUrl,
    status: "Message",
  };
  fields.hash = await hashValues(Object.values(fields), integrationKey);

  const encoded = new URLSearchParams(fields);
  const response = await fetch(PAYNOW_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: encoded.toString(),
  });
  const raw = await response.text();
  const result = parsePaynowMessage(raw);
  if (!response.ok || result.status?.toLowerCase() !== "ok") {
    return json({ ok: false, error: result.error ?? "paynow_initiation_failed" }, 502);
  }

  const browserUrl = result.browserurl;
  const pollUrl = result.pollurl;
  const returnedHash = result.hash ?? "";
  const returnedValues = Object.keys(result).filter((k) => k !== "hash").map((k) => result[k]);
  const expectedHash = await hashValues(returnedValues, integrationKey);
  if (!browserUrl || !pollUrl || returnedHash.toUpperCase() !== expectedHash) {
    return json({ ok: false, error: "paynow_response_verification_failed" }, 502);
  }

  await admin.from("payment_intents").update({
    provider: "paynow",
    provider_intent_id: reference,
    provider_checkout_url: browserUrl,
    provider_poll_url: pollUrl,
    status: "requires_action",
    updated_at: new Date().toISOString(),
  }).eq("id", paymentIntentId);

  return json({ ok: true, payment_intent_id: paymentIntentId, browser_url: browserUrl });
});
