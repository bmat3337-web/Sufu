import { supabase } from "./supabase";

export type RequestCategory = "service" | "product" | "job" | "business";
export type OfferStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface SufuRequest {
  id: string; requesterId: string; title: string; description: string;
  category: string | null; requestType: RequestCategory; budget: number | null;
  currency: string; city: string | null; suburb: string | null; countryCode: string | null; targetCountryCode: string | null; crossBorder: boolean | null;
  preferredDate: string | null; status: "open" | "matched" | "closed" | "cancelled"; createdAt: string;
}
export interface RequestOffer {
  id: string; requestId: string; providerId: string; price: number | null;
  currency: string; availability: string; duration: string | null; terms: string | null;
  message: string; status: OfferStatus; createdAt: string;
}
export interface CreateRequestInput {
  title: string; description: string; category?: string; requestType: RequestCategory;
  budget?: number; currency?: string; city: string; suburb?: string; countryCode?: string; targetCountryCode?: string; preferredDate?: string;
}
export interface CreateOfferInput {
  requestId: string; providerId: string; price?: number; currency?: string;
  availability: string; duration?: string; terms?: string; message: string;
}

function mapRequest(row: Record<string, unknown>): SufuRequest {
  return {
    id: String(row.id), requesterId: String(row.requester_id), title: String(row.title ?? ""),
    description: String(row.description ?? ""), category: row.category == null ? null : String(row.category),
    requestType: String(row.request_type ?? "service") as RequestCategory,
    budget: row.budget == null ? null : Number(row.budget), currency: String(row.currency ?? "USD"),
    countryCode: row.origin_country_code == null ? null : String(row.origin_country_code), targetCountryCode: row.target_country_code == null ? null : String(row.target_country_code), crossBorder: row.cross_border == null ? null : Boolean(row.cross_border),
    city: row.city == null ? null : String(row.city), suburb: row.suburb == null ? null : String(row.suburb),
    preferredDate: row.preferred_date == null ? null : String(row.preferred_date),
    status: String(row.status ?? "open") as SufuRequest["status"], createdAt: String(row.created_at ?? ""),
  };
}
function mapOffer(row: Record<string, unknown>): RequestOffer {
  return {
    id: String(row.id), requestId: String(row.request_id), providerId: String(row.provider_id),
    price: row.price == null ? null : Number(row.price), currency: String(row.currency ?? "USD"),
    availability: String(row.availability ?? ""), duration: row.duration == null ? null : String(row.duration),
    terms: row.terms == null ? null : String(row.terms), message: String(row.message ?? ""),
    status: String(row.status ?? "pending") as OfferStatus, createdAt: String(row.created_at ?? ""),
  };
}

export async function createRequest(userId: string, input: CreateRequestInput): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from("requests").insert({
    requester_id: userId, title: input.title.trim(), description: input.description.trim(),
    category: input.category?.trim() || null, request_type: input.requestType,
    budget: input.budget ?? null, currency: input.currency ?? "USD", city: input.city.trim(),
    suburb: input.suburb?.trim() || null, origin_country_code: input.countryCode ?? "ZW", target_country_code: input.targetCountryCode ?? input.countryCode ?? "ZW", preferred_date: input.preferredDate || null, status: "open",
  }).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function getRequest(id: string): Promise<SufuRequest | null> {
  const { data, error } = await supabase.from("requests")
    .select("id,requester_id,title,description,category,request_type,budget,currency,city,suburb,origin_country_code,target_country_code,cross_border,preferred_date,status,created_at")
    .eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapRequest(data as Record<string, unknown>);
}

export async function discoverRequests(filters: { q?: string; country?: string; city?: string; suburb?: string; requestType?: RequestCategory } = {}): Promise<SufuRequest[]> {
  let query = supabase.from("requests").select("id,requester_id,title,description,category,request_type,budget,currency,city,suburb,preferred_date,status,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(100);
  if (filters.country) query = query.eq("target_country_code", filters.country.toUpperCase());
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.suburb) query = query.eq("suburb", filters.suburb);
  if (filters.requestType) query = query.eq("request_type", filters.requestType);
  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[\\%_,()]/g, " ").replace(/\s+/g, " ");
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapRequest(row as Record<string, unknown>));
}

export async function createOffer(input: CreateOfferInput): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from("request_offers").insert({
    request_id: input.requestId, provider_id: input.providerId, price: input.price ?? null,
    currency: input.currency ?? "USD", availability: input.availability.trim(),
    duration: input.duration?.trim() || null, terms: input.terms?.trim() || null,
    message: input.message.trim(), status: "pending",
  }).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function offersForRequest(requestId: string): Promise<RequestOffer[]> {
  const { data, error } = await supabase.from("request_offers")
    .select("id,request_id,provider_id,price,currency,availability,duration,terms,message,status,created_at")
    .eq("request_id", requestId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => mapOffer(row as Record<string, unknown>));
}

export async function updateOfferStatus(offerId: string, status: Extract<OfferStatus, "accepted" | "declined" | "withdrawn">): Promise<{ error?: string }> {
  const { error } = await supabase.from("request_offers").update({ status, updated_at: new Date().toISOString() }).eq("id", offerId);
  return error ? { error: error.message } : {};
}

export async function acceptRequestOffer(offerId: string): Promise<{ requestId?: string; providerId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("accept_request_offer", { p_offer_id: offerId });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.request_id || !row?.provider_id) return { error: "The offer could not be accepted." };
  return { requestId: String(row.request_id), providerId: String(row.provider_id) };
}
