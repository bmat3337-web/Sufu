import { supabase } from "./supabase";

export type RequestCategory = "service" | "product" | "job" | "business";

export interface SufuRequest {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  category: string | null;
  requestType: RequestCategory;
  budget: number | null;
  currency: string;
  city: string | null;
  suburb: string | null;
  preferredDate: string | null;
  status: "open" | "matched" | "closed" | "cancelled";
  createdAt: string;
}

export interface CreateRequestInput {
  title: string;
  description: string;
  category?: string;
  requestType: RequestCategory;
  budget?: number;
  currency?: string;
  city: string;
  suburb?: string;
  preferredDate?: string;
}

function mapRequest(row: Record<string, unknown>): SufuRequest {
  return {
    id: String(row.id),
    requesterId: String(row.requester_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: row.category == null ? null : String(row.category),
    requestType: String(row.request_type ?? "service") as RequestCategory,
    budget: row.budget == null ? null : Number(row.budget),
    currency: String(row.currency ?? "USD"),
    city: row.city == null ? null : String(row.city),
    suburb: row.suburb == null ? null : String(row.suburb),
    preferredDate: row.preferred_date == null ? null : String(row.preferred_date),
    status: String(row.status ?? "open") as SufuRequest["status"],
    createdAt: String(row.created_at ?? ""),
  };
}

export async function createRequest(userId: string, input: CreateRequestInput): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("requests")
    .insert({
      requester_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category?.trim() || null,
      request_type: input.requestType,
      budget: input.budget ?? null,
      currency: input.currency ?? "USD",
      city: input.city.trim(),
      suburb: input.suburb?.trim() || null,
      preferred_date: input.preferredDate || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function discoverRequests(filters: {
  q?: string;
  city?: string;
  suburb?: string;
  requestType?: RequestCategory;
} = {}): Promise<SufuRequest[]> {
  let query = supabase
    .from("requests")
    .select("id,requester_id,title,description,category,request_type,budget,currency,city,suburb,preferred_date,status,created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

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
