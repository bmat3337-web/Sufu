import { supabase } from "./supabase";
import type { Listing } from "../data";

export interface RequestMatch {
  listingId: string;
  score: number;
  reason: string;
}

export async function matchRequestListings(requestId: string): Promise<RequestMatch[]> {
  const { data, error } = await supabase.rpc("match_request_listings", { p_request_id: requestId });
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    listingId: String(row.listing_id),
    score: Number(row.match_score ?? 0),
    reason: String(row.match_reason ?? "Relevant match"),
  }));
}

export function matchLabel(match: RequestMatch): string {
  if (match.score >= 80) return "Strong match";
  if (match.score >= 55) return "Good match";
  return "Relevant match";
}
