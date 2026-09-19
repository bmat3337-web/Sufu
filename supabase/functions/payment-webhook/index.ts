// SUFU C.20 — provider-neutral payment webhook boundary.
// This function intentionally accepts a normalized settlement envelope.
// A provider-specific adapter must verify the provider's native signature,
// translate its payload into this envelope, and then call this endpoint.
// No browser/client credential can invoke settlement.
//
// Required environment:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   PAYMENT_WEBHOOK_SECRET_<PROVIDER> (uppercase, non-alphanumeric -> _)
//
// Headers:
//   x-sufu-signature = hex HMAC-SHA256(rawBody, provider secret)
//   x-sufu-timestamp = unix seconds
//
// Envelope:
//   { provider, event_id, event_type, status, payment_intent_id,
//     provider_intent_id?, amount_minor, currency }

import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json({ ok: false, error: "server_not_configured" }, 500);

  const body = await req.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  const signature = req.headers.get("x-sufu-signature") ?? "";
  const timestamp = req.headers.get("x-sufu-timestamp") ?? "";
  const timestampSeconds = Number(timestamp);
  if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(timestampSeconds)) {
    return json({ ok: false, error: "invalid_timestamp" }, 401);
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return json({ ok: false, error: "stale_webhook" }, 401);
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const provider = typeof envelope.provider === "string" ? envelope.provider.trim().toLowerCase() : "";
  const eventId = typeof envelope.event_id === "string" ? envelope.event_id.trim() : "";
  const eventType = typeof envelope.event_type === "string" ? envelope.event_type.trim() : "";
  const status = typeof envelope.status === "string" ? envelope.status.trim() : "";
  const paymentIntentId = typeof envelope.payment_intent_id === "string" ? envelope.payment_intent_id : "";
  const providerIntentId = typeof envelope.provider_intent_id === "string" ? envelope.provider_intent_id : null;
  const amountMinor = typeof envelope.amount_minor === "number" ? envelope.amount_minor : Number(envelope.amount_minor);
  const currency = typeof envelope.currency === "string" ? envelope.currency.trim().toUpperCase() : "";

  if (!provider || !eventId || !eventType || !status || !paymentIntentId || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currency)) {
    return json({ ok: false, error: "invalid_settlement_envelope" }, 400);
  }

  const secretName = "PAYMENT_WEBHOOK_SECRET_" + provider.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const secret = Deno.env.get(secretName);
  if (!secret) return json({ ok: false, error: "provider_not_configured" }, 503);

  const expected = await hmacHex(secret, timestamp + "." + body);
  if (!constantTimeEqual(expected, signature.toLowerCase())) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc("apply_payment_settlement", {
    p_payment_intent_id: paymentIntentId,
    p_provider: provider,
    p_provider_event_id: eventId,
    p_event_type: eventType,
    p_status: status,
    p_provider_intent_id: providerIntentId,
    p_amount_minor: amountMinor,
    p_currency: currency,
  });

  if (error) return json({ ok: false, error: "settlement_rejected" }, 400);
  return json({ ok: true, payment_intent_id: data?.id ?? paymentIntentId, status: data?.status ?? status });
});
