import { supabase } from "./supabase";
import type { ExploreFilters, Listing, ListingType, Location } from "../data";

interface DiscoveryRow {
  id: string;
  type: ListingType;
  title: string;
  description: string;
  category: string | null;
  price: number | string | null;
  salary_label: string | null;
  condition: string | null;
  employment_type: string | null;
  remote: boolean;
  city: string | null;
  suburb: string | null;
  supply_country_code: string | null;
  fulfilment_country_code: string | null;
  provider_id: string;
  status: string;
  views: number;
  featured: boolean;
  cover_image_url: string | null;
  tags: string[];
  posted_at: string;
  latitude: number | null;
  longitude: number | null;
}

const toListing = (row: DiscoveryRow): Listing => ({
  id: row.id,
  type: row.type,
  title: row.title,
  category: row.category ?? "",
  description: row.description,
  price: row.price == null ? undefined : Number(row.price),
  salaryLabel: row.salary_label ?? undefined,
  condition: row.condition ?? undefined,
  employmentType: row.employment_type ?? undefined,
  remote: row.remote,
  location: { city: row.city ?? "", suburb: row.suburb ?? "", countryCode: row.supply_country_code ?? undefined } satisfies Location,
  providerId: row.provider_id,
  postedAt: row.posted_at,
  views: row.views,
  tags: row.tags ?? [],
  featured: row.featured,
  coverImageUrl: row.cover_image_url ?? undefined,
});

const groupType = (group?: string): ListingType | undefined =>
  group === "services" ? "service" : group === "marketplace" ? "product" : group === "jobs" ? "job" : undefined;

const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const r = 6371.0088;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.asin(Math.sqrt(x));
};

export interface DiscoveryFilters extends ExploreFilters {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/** Live marketplace discovery. GPS is optional. */
export async function discoverListings(filters: DiscoveryFilters): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select("id,type,title,description,category,price,salary_label,condition,employment_type,remote,city,suburb,supply_country_code,fulfilment_country_code,provider_id,status,views,featured,cover_image_url,tags,posted_at,latitude,longitude")
    .eq("status", "active");

  const type = groupType(filters.group);
  if (type) query = query.eq("type", type);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.suburb) query = query.eq("suburb", filters.suburb);
  if (filters.country) query = query.eq("supply_country_code", filters.country.toUpperCase());
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%,_]/g, " ").replace(/\./g, " ");
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) return [];

  const rows = (data ?? []) as DiscoveryRow[];
  const geoReady = filters.latitude != null && filters.longitude != null;
  const radius = Math.max(1, Math.min(filters.radiusKm ?? 25, 500));

  return rows
    .map((row) => ({
      listing: toListing(row),
      distance: geoReady && row.latitude != null && row.longitude != null
        ? distanceKm(filters.latitude!, filters.longitude!, row.latitude, row.longitude)
        : null,
    }))
    .filter((item) => !geoReady || item.distance == null || item.distance <= radius)
    .sort((a, b) => {
      if (a.distance != null && b.distance != null && a.distance !== b.distance) return a.distance - b.distance;
      if (a.listing.featured !== b.listing.featured) return Number(b.listing.featured) - Number(a.listing.featured);
      return new Date(b.listing.postedAt).getTime() - new Date(a.listing.postedAt).getTime();
    })
    .map((item) => item.listing);
}
