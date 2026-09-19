import { supabase } from "./supabase";

export type PaymentIntentStatus =
  | "pending"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export interface PaymentIntent {
  id: string;
  sourceType: "order" | "engagement";
  sourceId: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  platformFeeMinor: number;
  currency: string;
  status: PaymentIntentStatus;
  provider: string | null;
  providerIntentId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

function map(row: Record<string, unknown>): PaymentIntent {
  return {
    id: String(row.id),
    sourceType: row.source_type as PaymentIntent["sourceType"],
    sourceId: String(row.source_id),
    payerId: String(row.payer_id),
    payeeId: String(row.payee_id),
    amountMinor: Number(row.amount_minor),
    platformFeeMinor: Number(row.platform_fee_minor),
    currency: String(row.currency),
    status: row.status as PaymentIntentStatus,
    provider: row.provider == null ? null : String(row.provider),
    providerIntentId: row.provider_intent_id == null ? null : String(row.provider_intent_id),
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Creates an intent through the server-authoritative RPC. Amount and parties are never accepted from the client. */
export async function createPaymentIntent(
  sourceType: PaymentIntent["sourceType"],
  sourceId: string,
  idempotencyKey: string,
): Promise<{ paymentIntent?: PaymentIntent; error?: string }> {
  const { data, error } = await supabase.rpc("create_payment_intent", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id
    ? { paymentIntent: map(row as Record<string, unknown>) }
    : { error: "The payment intent could not be created." };
}

export async function paymentIntentsForUser(userId: string): Promise<PaymentIntent[]> {
  const { data, error } = await supabase
    .from("payment_intents")
    .select("*")
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return error ? [] : (data ?? []).map((row) => map(row as Record<string, unknown>));
}

export async function startPaynowCheckout(paymentIntentId: string): Promise<{ browserUrl?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("paynow-initiate", {
    body: { payment_intent_id: paymentIntentId },
  });
  if (error) return { error: error.message };
  if (!data?.ok || typeof data.browser_url !== "string") {
    return { error: data?.error ?? "Paynow checkout could not be started." };
  }
  return { browserUrl: data.browser_url };
}
