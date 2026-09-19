import { supabase } from "./supabase";

export type EscrowStatus = "pending" | "funded" | "released" | "refunded" | "disputed" | "cancelled";

export interface EscrowHold {
  id: string;
  engagementId: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  currency: string;
  status: EscrowStatus;
  fundedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function map(row: Record<string, unknown>): EscrowHold {
  return {
    id: String(row.id), engagementId: String(row.engagement_id),
    payerId: String(row.payer_id), payeeId: String(row.payee_id),
    amountMinor: Number(row.amount_minor), currency: String(row.currency),
    status: row.status as EscrowStatus,
    fundedAt: row.funded_at == null ? null : String(row.funded_at),
    releasedAt: row.released_at == null ? null : String(row.released_at),
    refundedAt: row.refunded_at == null ? null : String(row.refunded_at),
    createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getEscrowForEngagement(engagementId: string): Promise<EscrowHold | null> {
  const { data, error } = await supabase.from("escrow_holds").select("*").eq("engagement_id", engagementId).maybeSingle();
  return error || !data ? null : map(data as Record<string, unknown>);
}

export async function requestEscrowFunding(engagementId: string, paymentIntentId: string) {
  const { data, error } = await supabase.rpc("request_escrow_funding", {
    p_engagement_id: engagementId, p_payment_intent_id: paymentIntentId,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id ? { escrow: map(row as Record<string, unknown>) } : { error: "Escrow could not be prepared." };
}

export async function releaseEscrow(engagementId: string) {
  const { data, error } = await supabase.rpc("release_escrow", { p_engagement_id: engagementId });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id ? { escrow: map(row as Record<string, unknown>) } : { error: "Escrow could not be released." };
}
