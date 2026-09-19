/* ------------------------------------------------------------------ *
 * SUFU shared domain types + small pure helpers.                      *
 * All marketplace data (listings, providers, categories, locations)   *
 * is read live from Supabase via src/lib/api.ts — there is no mock    *
 * dataset in production paths.                                        *
 * ------------------------------------------------------------------ */

export type ListingType = "service" | "product" | "job";
export type Group = "services" | "marketplace" | "jobs" | "businesses";
export type VerificationId = "phone" | "email" | "identity" | "business";
export type SortKey = "newest" | "price-asc" | "price-desc" | "rating";

export interface Location {
  city: string;
  suburb: string;
}

export interface ProviderService {
  name: string;
  priceFrom: number;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface PortfolioItem {
  title: string;
  kind: string;
}

export interface Provider {
  id: string;
  name: string;
  isBusiness: boolean;
  category: string;
  tagline: string;
  bio: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  responseTime: string;
  location: Location;
  memberSince: string;
  languages: string[];
  verified: VerificationId[];
  services: ProviderService[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  hours?: string;
  employees?: string;
}

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  category: string;
  description: string;
  price?: number;
  salaryLabel?: string;
  condition?: string;
  employmentType?: string;
  remote?: boolean;
  location: Location;
  providerId: string;
  postedAt: string; // ISO
  views: number;
  tags: string[];
  featured?: boolean;
  coverImageUrl?: string;
}

/** Static navigation config — the four browse groups. */
export const categoryGroups: { id: Group; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "marketplace", label: "Marketplace" },
  { id: "jobs", label: "Jobs" },
  { id: "businesses", label: "Businesses" },
];

export const formatUSD = (n: number) => `$${n.toLocaleString("en-US")}`;

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export interface ExploreFilters {
  q?: string;
  group?: Group | "all";
  city?: string;
  suburb?: string;
  sort?: SortKey;
}
