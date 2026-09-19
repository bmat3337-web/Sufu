import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});

async function sha512Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parseForm(text: string): Record<string, string> {
  const params = new URLSearchParams(text);
  return Object.fromEntries(Array.from(params.entries()).map(([k, v]) => [k.toLowerCase(), v]));
}

function mapStatus(status: string): "processing" | "succeeded" | "failed" | "cancelled" | "refunded" {
  switch (status.toLowerCase()) {
    case "paid":
    case "delivered":
    case "awaiting delivery": return "succeeded";
    case "refunded": return "refunded";
    case "cancelled": return "cancelled";
    case "disputed": return "processing";
    case "created":
    case "sent":
    case "awaiting payment":
    case "pending": return "processing";
    default: return "processing";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!integrationKey || !url || !serviceRole) return json({ ok: false, error: "server_not_configured" }, 500);

  const raw = await req.text();
  const result = parseForm(raw);
  const suppliedHash = result.hash ?? "";
  if (!suppliedHash) return json({ ok: false, error: "missing_hash" }, 400);

  const values = Object.keys(result).filter((k) => k !== "hash").map((k) => result[k]);
  const expectedHash = await sha512Hex(values.join("") + integrationKey);
  if (suppliedHash.toUpperCase() !== expectedHash) return json({ ok: false, error: "invalid_paynow_hash" }, 401);

  const reference = result.reference ?? "";
  const amount = Number(result.amount);
  const status = result.status ?? "";
  const paynowReference = result.paynowreference ?? "";
  const pollUrl = result.pollurl ?? "";
  if (!reference || !Number.isFinite(amount) || amount <= 0 || !status) return json({ ok: false, error: "invalid_paynow_result" }, 400);

  const paymentIntentId = reference.startsWith("SUFU-") ? reference.slice(5) : "";
  if (!paymentIntentId) return json({ ok: false, error: "unknown_reference" }, 400);

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: pi, error } = await admin.from("payment_intents").select("id,amount_minor,currency").eq("id", paymentIntentId).maybeSingle();
  if (error || !pi) return json({ ok: false, error: "payment_intent_not_found" }, 404);

  const amountMinor = Math.round(amount * 100);
  if (amountMinor !== Number(pi.amount_minor)) return json({ ok: false, error: "amount_mismatch" }, 400);

  const normalizedStatus = mapStatus(status);
  const { error: settlementError } = await admin.rpc("apply_payment_settlement", {
    p_payment_intent_id: paymentIntentId,
    p_provider: "paynow",
    p_provider_event_id: paynowReference || reference + ":" + status,
    p_event_type: "paynow.status." + status.toLowerCase().replaceAll(" ", "_"),
    p_status: normalizedStatus,
    p_provider_intent_id: paynowReference || reference,
    p_amount_minor: amountMinor,
    p_currency: String(pi.currency).toUpperCase(),
  });

  if (settlementError) return json({ ok: false, error: "settlement_rejected" }, 400);

  if (pollUrl) {
    await admin.from("payment_intents").update({ provider_poll_url: pollUrl, updated_at: new Date().toISOString() }).eq("id", paymentIntentId);
  }

  return new Response("OK", { status: 200 });
});
