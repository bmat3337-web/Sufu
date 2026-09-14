import { supabase } from "./supabase";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "cancelled" | "expired" | "completed";

export interface SufuQuote {
  id: string; requestId: string; offerId: string; requesterId: string; providerId: string;
  title: string; scope: string; amount: number; currency: string;
  startDate: string | null; dueDate: string | null; terms: string | null;
  status: QuoteStatus; createdAt: string; updatedAt: string;
}

export interface CreateQuoteInput {
  requestId: string; offerId: string; requesterId: string; providerId: string;
  title: string; scope: string; amount: number; currency: string;
  startDate?: string; dueDate?: string; terms?: string;
}

function mapQuote(row: Record<string, unknown>): SufuQuote {
  return {
    id: String(row.id), requestId: String(row.request_id), offerId: String(row.offer_id),
    requesterId: String(row.requester_id), providerId: String(row.provider_id),
    title: String(row.title ?? ""), scope: String(row.scope ?? ""), amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "USD"), startDate: row.start_date == null ? null : String(row.start_date),
    dueDate: row.due_date == null ? null : String(row.due_date), terms: row.terms == null ? null : String(row.terms),
    status: String(row.status ?? "draft") as QuoteStatus, createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function createQuote(input: CreateQuoteInput): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from("quotes").insert({
    request_id: input.requestId, offer_id: input.offerId, requester_id: input.requesterId,
    provider_id: input.providerId, title: input.title.trim(), scope: input.scope.trim(),
    amount: input.amount, currency: input.currency, start_date: input.startDate || null,
    due_date: input.dueDate || null, terms: input.terms?.trim() || null, status: "sent",
  }).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function quotesForRequest(requestId: string): Promise<SufuQuote[]> {
  const { data, error } = await supabase.from("quotes").select("*").eq("request_id", requestId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => mapQuote(row as Record<string, unknown>));
}

export async function acceptQuote(quoteId: string): Promise<{ quote?: SufuQuote; error?: string }> {
  const { data, error } = await supabase.rpc("accept_quote", { p_quote_id: quoteId });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { quote: mapQuote(row as Record<string, unknown>) } : { error: "The quote could not be accepted." };
}
