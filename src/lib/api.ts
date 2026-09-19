/* ------------------------------------------------------------------ *
 * SUFU client data layer — live Supabase queries.                     *
 * Mirrors the helper signatures from src/data.ts (which stays as the  *
 * type source of truth + offline fallback) so pages change minimally. *
 * All row types below are the snake_case shapes returned by PostgREST. *
 * ------------------------------------------------------------------ */

import { supabase } from "./supabase";
import type {
  ExploreFilters,
  Group,
  Listing,
  ListingType,
  Location,
  PortfolioItem,
  Provider,
  ProviderService,
  Review,
  VerificationId,
} from "../data";

/* ----------------------------- row types ----------------------------- */

interface ProfileRow {
  id: string;
  display_name: string;
  is_business: boolean;
  category: string | null;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  suburb: string | null;
  member_since: string;
  languages: string[];
  hours: string | null;
  employees: string | null;
  response_time: string | null;
  avatar_url: string | null;
  verified_phone: boolean;
  verified_email: boolean;
  verified_identity: boolean;
  verified_business: boolean;
  rating: number | string;
  review_count: number;
  completed_jobs: number;
}

interface ListingRow {
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
  provider_id: string;
  status: string;
  views: number;
  featured: boolean;
  cover_image_url: string | null;
  tags: string[];
  posted_at: string;
}

/* ----------------------------- mappers ------------------------------ */

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : Number(v);

function toLocation(row: { city: string | null; suburb: string | null }): Location {
  return { city: row.city ?? "", suburb: row.suburb ?? "" };
}

function toVerified(row: ProfileRow): VerificationId[] {
  const out: VerificationId[] = [];
  if (row.verified_phone) out.push("phone");
  if (row.verified_email) out.push("email");
  if (row.verified_identity) out.push("identity");
  if (row.verified_business) out.push("business");
  return out;
}

function toProviderBase(row: ProfileRow): Provider {
  return {
    id: row.id,
    name: row.display_name,
    isBusiness: row.is_business,
    category: row.category ?? "",
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    rating: num(row.rating),
    reviewCount: row.review_count,
    completedJobs: row.completed_jobs,
    responseTime: row.response_time ?? "~1 hour",
    location: toLocation(row),
    memberSince: row.member_since ? String(new Date(row.member_since).getFullYear()) : "",
    languages: row.languages ?? [],
    verified: toVerified(row),
    services: [],
    portfolio: [],
    reviews: [],
    hours: row.hours ?? undefined,
    employees: row.employees ?? undefined,
  };
}

function toListing(row: ListingRow): Listing {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category ?? "",
    description: row.description,
    price: row.price == null ? undefined : num(row.price),
    salaryLabel: row.salary_label ?? undefined,
    condition: row.condition ?? undefined,
    employmentType: row.employment_type ?? undefined,
    remote: row.remote,
    location: toLocation(row),
    providerId: row.provider_id,
    postedAt: row.posted_at,
    views: row.views,
    tags: row.tags ?? [],
    featured: row.featured,
    coverImageUrl: row.cover_image_url ?? undefined,
  };
}

const formatReviewDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const groupToType = (group: Group): ListingType =>
  group === "services" ? "service" : group === "marketplace" ? "product" : "job";

/* ----------------------------- listings ------------------------------ */

export async function listingsForGroup(group: Group): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("type", groupToType(group))
    .eq("status", "active")
    .order("posted_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => toListing(r as ListingRow));
}

export async function popularForGroup(group: Group, limit = 4): Promise<Listing[]> {
  const all = await listingsForGroup(group);
  return [...all]
    .sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.views - a.views
    )
    .slice(0, limit);
}

export async function latestOpportunities(limit = 4): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .neq("type", "service")
    .eq("status", "active")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => toListing(r as ListingRow));
}

export async function listingById(id: string): Promise<Listing | undefined> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return toListing(data as ListingRow);
}

/**
 * Fire-and-forget view counter (privileged column — RPC only).
 * The RPC skips the count when the viewer is the listing owner, so an
 * optional viewer id prevents self-inflating views.
 */
export async function incrementViews(
  listingId: string,
  viewerId?: string | null
): Promise<void> {
  await supabase.rpc("increment_views", {
    p_listing_id: listingId,
    p_viewer_id: viewerId ?? null,
  });
}

export async function searchListings(filters: ExploreFilters): Promise<Listing[]> {
  const params: Record<string, unknown> = {
    q: filters.q ?? "",
    sort: filters.sort ?? "newest",
    limit: 100,
    offset: 0,
  };
  if (filters.group && filters.group !== "all") params.group = filters.group;
  if (filters.city) params.city = filters.city;
  if (filters.suburb) params.suburb = filters.suburb;

  const { data, error } = await supabase.rpc("search_listings", { filters: params });
  if (error) return [];
  return ((data ?? []) as ListingRow[]).map((r) => toListing(r));
}

/* ----------------------------- providers ----------------------------- */

export async function providerById(id: string): Promise<Provider | undefined> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !profile) return undefined;

  const [servicesRes, portfolioRes, reviewsRes] = await Promise.all([
    supabase
      .from("provider_services")
      .select("name, price_from")
      .eq("provider_id", id)
      .order("price_from", { ascending: true }),
    supabase
      .from("portfolio_items")
      .select("title, kind")
      .eq("provider_id", id),
    supabase
      .from("reviews")
      .select("rating, text, created_at, author:author_id(display_name)")
      .eq("provider_id", id)
      .order("created_at", { ascending: false }),
  ]);

  interface ReviewRow {
    rating: number;
    text: string | null;
    created_at: string;
    author: { display_name: string } | null;
  }
  interface ServiceRow {
    name: string;
    price_from: number | string;
  }
  interface PortfolioRow {
    title: string;
    kind: string | null;
  }

  const provider = toProviderBase(profile as ProfileRow);
  provider.services = ((servicesRes.data ?? []) as ServiceRow[]).map(
    (s): ProviderService => ({ name: s.name, priceFrom: num(s.price_from) })
  );
  provider.portfolio = ((portfolioRes.data ?? []) as PortfolioRow[]).map(
    (p): PortfolioItem => ({ title: p.title, kind: p.kind ?? "" })
  );
  provider.reviews = ((reviewsRes.data ?? []) as unknown as ReviewRow[]).map(
    (r): Review => ({
      author: r.author?.display_name ?? "Sufu member",
      rating: r.rating,
      date: formatReviewDate(r.created_at),
      text: r.text ?? "",
    })
  );
  return provider;
}

export async function businessProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_business", true)
    .order("rating", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => toProviderBase(r as ProfileRow));
}

export async function providersForGroup(group: Group): Promise<Provider[]> {
  if (group === "businesses") return businessProviders();
  const listings = await listingsForGroup(group);
  const ids = [...new Set(listings.map((l) => l.providerId))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (error) return [];
  return (data ?? []).map((r) => toProviderBase(r as ProfileRow));
}

/** Batched profile fetch for listing cards — avoids an N+1 per card. */
export async function providersByIds(ids: string[]): Promise<Provider[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", unique);
  if (error) return [];
  return (data ?? []).map((r) => toProviderBase(r as ProfileRow));
}

export async function trustedProviders(group: Group, limit = 3): Promise<Provider[]> {
  const all = await providersForGroup(group);
  return [...all].sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export async function searchProviders(filters: ExploreFilters): Promise<Provider[]> {
  let query = supabase.from("profiles").select("*");
  if (filters.group === "businesses") query = query.eq("is_business", true);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.suburb) query = query.eq("suburb", filters.suburb);

  const q = filters.q?.trim();
  if (q) {
    // PostgREST `or` syntax — quote values so dots/special chars are safe.
    const safe = q.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const like = `"*${safe}*"`;
    query = query.or(
      `display_name.ilike.${like},category.ilike.${like},tagline.ilike.${like},bio.ilike.${like}`
    );
  }

  const { data, error } = await query.order("rating", { ascending: false }).limit(100);
  if (error) return [];
  return (data ?? []).map((r) => toProviderBase(r as ProfileRow));
}

/* ------------------------------ categories --------------------------- */

export async function fetchCategories(): Promise<{ name: string; group: Group }[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name, group");
  if (error) return [];
  return ((data ?? []) as { name: string; group: string }[]).map((r) => ({
    name: r.name,
    group: (r.group ?? "services") as Group,
  }));
}

export async function fetchCountries(): Promise<{ code: string; name: string; defaultCurrency: string }[]> {
  const { data, error } = await supabase
    .from("sufu_countries")
    .select("country_code,name,default_currency")
    .eq("enabled", true)
    .order("name");
  if (error) return [];
  return ((data ?? []) as { country_code: string; name: string; default_currency: string }[]).map((r) => ({
    code: r.country_code,
    name: r.name,
    defaultCurrency: r.default_currency,
  }));
}

/* ------------------------------ locations ---------------------------- */

export async function fetchCities(): Promise<{ name: string; suburbs: string[] }[]> {
  const { data, error } = await supabase.from("cities").select("name, suburbs:suburbs(name)");
  if (error) return [];
  return ((data ?? []) as { name: string; suburbs: { name: string }[] }[]).map((r) => ({
    name: r.name,
    suburbs: (r.suburbs ?? []).map((s) => s.name),
  }));
}

/* ------------------------------ writes ------------------------------- */

export interface NewListingInput {
  type: Exclude<ListingType, "business">;
  title: string;
  description: string;
  category?: string;
  price?: number;
  salaryLabel?: string;
  condition?: string;
  employmentType?: string;
  remote?: boolean;
  city?: string;
  suburb?: string;
  countryCode?: string;
  coverImageUrl?: string;
}

/**
 * Publish a listing owned by the signed-in user.
 * RLS enforces provider_id = auth.uid(); privileged columns (views, featured)
 * are never sent from the client.
 */
export async function createListing(
  providerId: string,
  input: NewListingInput
): Promise<{ id?: string; error?: string }> {
  const row: Record<string, unknown> = {
    type: input.type,
    title: input.title,
    description: input.description,
    provider_id: providerId,
    status: "active",
    remote: Boolean(input.remote),
  };
  if (input.category) row.category = input.category;
  if (input.price != null && input.price > 0) row.price = input.price;
  if (input.salaryLabel) row.salary_label = input.salaryLabel;
  if (input.condition) row.condition = input.condition;
  if (input.employmentType) row.employment_type = input.employmentType;
  if (input.city) row.city = input.city;
  if (input.suburb) row.suburb = input.suburb;
  if (input.countryCode) row.supply_country_code = input.countryCode.toUpperCase();
  if (input.coverImageUrl) row.cover_image_url = input.coverImageUrl;

  const { data, error } = await supabase.from("listings").insert(row).select("id").single();
  if (error) return { error: error.message };
  const created = (Array.isArray(data) ? data[0] : data) as { id?: string } | null;
  return { id: created?.id };
}

export async function setListingCoverImage(listingId: string, coverImageUrl: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("listings").update({ cover_image_url: coverImageUrl }).eq("id", listingId);
  return error ? { error: "The listing image could not be saved." } : {};
}

export interface ProfilePatch {
  display_name?: string;
  is_business?: boolean;
  category?: string;
  tagline?: string;
  bio?: string;
  city?: string;
  suburb?: string;
}

/** Keys a client may self-edit. Everything else (verified_*, rating, views, …) is
 *  rejected by column grants server-side; this whitelist is defence-in-depth so a
 *  future drift in the client can never attempt a privileged write. */
const OWN_PROFILE_PATCH_KEYS = [
  "display_name",
  "is_business",
  "category",
  "tagline",
  "bio",
  "city",
  "suburb",
] as const;

/** Update the signed-in user's own profile row (RLS: id = auth.uid()). */
export async function updateOwnProfile(
  userId: string,
  patch: ProfilePatch
): Promise<{ error?: string }> {
  const sanitized: Record<string, unknown> = {};
  for (const key of OWN_PROFILE_PATCH_KEYS) {
    if (patch[key] !== undefined) sanitized[key] = patch[key];
  }
  const { error } = await supabase.from("profiles").update(sanitized).eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

/* ------------------------------ messaging ----------------------------- */

export interface ConversationSummary {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  otherId: string;
  otherName: string;
  otherIsBusiness: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
  unreadCount: number;
}

export interface ThreadMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
}

export interface ConversationDetail {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  otherId: string;
  otherName: string;
  otherIsBusiness: boolean;
}

/**
 * Create-or-reuse the normalized 1:1 conversation between the signed-in
 * user and `otherId` for a listing (or `null` for a plain provider chat).
 * SECURITY DEFINER RPC — normalizes user_a < user_b itself.
 */
export async function getOrCreateConversation(
  listingId: string | null,
  otherId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_listing_id: listingId,
    p_other_id: otherId,
  });
  if (error || !data) return null;
  return (data as { id?: string }).id ?? null;
}

/** Thread metadata for the current user. RLS returns nothing for non-participants. */
export async function conversationDetail(
  id: string,
  meId: string
): Promise<ConversationDetail | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, listing_id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const otherId = data.user_a === meId ? data.user_b : data.user_a;
  const [profileRes, listingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, is_business")
      .eq("id", otherId)
      .maybeSingle(),
    data.listing_id
      ? supabase.from("listings").select("title").eq("id", data.listing_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: data.id,
    listingId: data.listing_id,
    listingTitle: listingRes.data?.title ?? null,
    otherId,
    otherName: profileRes.data?.display_name ?? "Sufu member",
    otherIsBusiness: Boolean(profileRes.data?.is_business),
  };
}

/** The signed-in user's conversations, newest first, with last message + unread count. */
export async function myConversations(meId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, listing_id, user_a, user_b, updated_at")
    .or(`user_a.eq.${meId},user_b.eq.${meId}`)
    .order("updated_at", { ascending: false });
  if (error || !data || data.length === 0) return [];

  const otherIds = data.map((c) => (c.user_a === meId ? c.user_b : c.user_a));
  const listingIds = [...new Set(data.map((c) => c.listing_id).filter(Boolean))] as string[];

  const [profilesRes, listingsRes, messagesRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, is_business").in("id", otherIds),
    listingIds.length > 0
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("messages")
      .select("conversation_id, sender_id, body, created_at, read_at")
      .in("conversation_id", data.map((c) => c.id))
      .order("created_at", { ascending: true }),
  ]);

  const names = new Map(
    (profilesRes.data ?? []).map((p: { id: string; display_name: string; is_business: boolean }) => [
      p.id,
      p,
    ])
  );
  const titles = new Map(
    (listingsRes.data ?? []).map((l: { id: string; title: string }) => [l.id, l.title])
  );

  const byConversation = new Map<string, ThreadMessage[]>();
  for (const m of (messagesRes.data ?? []) as {
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[]) {
    const list = byConversation.get(m.conversation_id) ?? [];
    list.push({
      id: m.conversation_id + m.created_at + list.length,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
      readAt: m.read_at,
      mine: m.sender_id === meId,
    });
    byConversation.set(m.conversation_id, list);
  }

  return data.map((c) => {
    const other = names.get(c.user_a === meId ? c.user_b : c.user_a);
    const msgs = byConversation.get(c.id) ?? [];
    const last = msgs[msgs.length - 1] ?? null;
    const unreadCount = msgs.filter((m) => !m.mine && !m.readAt).length;
    return {
      id: c.id,
      listingId: c.listing_id,
      listingTitle: c.listing_id ? (titles.get(c.listing_id) ?? null) : null,
      otherId: c.user_a === meId ? c.user_b : c.user_a,
      otherName: other?.display_name ?? "Sufu member",
      otherIsBusiness: Boolean(other?.is_business),
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.createdAt ?? c.updated_at,
      lastMessageMine: last?.mine ?? false,
      unreadCount,
    };
  });
}

/** All messages in a thread the current user participates in (RLS-guarded). */
export async function messagesForConversation(
  conversationId: string,
  meId: string
): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[]).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
    mine: m.sender_id === meId,
  }));
}

/** Insert a message as the signed-in user (RLS enforces participant + sender). */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) return { error: error.message };
  return {};
}

/** Mark messages I received as read (RLS only lets me touch the other party's rows). */
export async function markConversationRead(conversationId: string, meId: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", meId)
    .is("read_at", null);
}

/* ----------------------------- saved listings ------------------------- */

/** Is this listing saved by the user? (RLS: own rows only.) */
export async function isListingSaved(meId: string, listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("profile_id", meId)
    .eq("listing_id", listingId)
    .maybeSingle();
  return !error && !!data;
}

/** Toggle the heart — upsert or delete the user's own saved_listings row. */
export async function toggleSavedListing(
  meId: string,
  listingId: string
): Promise<{ saved: boolean; error?: string }> {
  const currently = await isListingSaved(meId, listingId);
  if (currently) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("profile_id", meId)
      .eq("listing_id", listingId);
    if (error) return { saved: true, error: error.message };
    return { saved: false };
  }
  const { error } = await supabase
    .from("saved_listings")
    .insert({ profile_id: meId, listing_id: listingId });
  if (error) return { saved: false, error: error.message };
  return { saved: true };
}

/** The user's saved listings (owner-only via RLS). */
export async function mySavedListings(meId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing:listings(*)")
    .eq("profile_id", meId)
    .order("saved_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as { listing: ListingRow | null }[])
    .map((r) => (r.listing ? toListing(r.listing) : null))
    .filter((l): l is Listing => !!l);
}

/* ---------------------------- job applications ------------------------ */

export interface ApplicationView {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: ListingType;
  applicantId: string;
  applicantName: string;
  coverNote: string | null;
  status: string;
  createdAt: string;
}

/** Apply to a job (RLS: applicant = me, listing must be a job I don't own, unique per pair). */
export async function applyToJob(
  listingId: string,
  applicantId: string,
  coverNote?: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("applications").insert({
    listing_id: listingId,
    applicant_id: applicantId,
    cover_note: coverNote ?? null,
  });
  if (error) return { error: error.message };
  return {};
}

export async function hasApplied(listingId: string, applicantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("listing_id", listingId)
    .eq("applicant_id", applicantId)
    .maybeSingle();
  return !error && !!data;
}

interface ApplicationRow {
  id: string;
  listing_id: string;
  listing: { id: string; title: string; type: ListingType; provider_id: string } | null;
  applicant: { id: string; display_name: string } | null;
  cover_note: string | null;
  status: string;
  created_at: string;
}

const toApplicationView = (r: ApplicationRow): ApplicationView => ({
  id: r.id,
  listingId: r.listing_id,
  listingTitle: r.listing?.title ?? "Removed listing",
  listingType: r.listing?.type ?? "job",
  applicantId: r.applicant?.id ?? "",
  applicantName: r.applicant?.display_name ?? "Sufu member",
  coverNote: r.cover_note,
  status: r.status,
  createdAt: r.created_at,
});

/** Applications on my own listings — the owner inbox in ProfilePage. */
export async function receivedApplications(ownerId: string): Promise<ApplicationView[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, listing_id, cover_note, status, created_at, listing:listings!inner(id, title, type, provider_id), applicant:profiles(id, display_name)"
    )
    .eq("listing.provider_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as ApplicationRow[]).map(toApplicationView);
}

/** Applications I have submitted (visible to the applicant via RLS). */
export async function myApplications(applicantId: string): Promise<ApplicationView[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, listing_id, cover_note, status, created_at, listing:listings(id, title, type), applicant:profiles(id, display_name)")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as ApplicationRow[]).map(toApplicationView);
}

export type ApplicationStatus = "pending" | "shortlisted" | "accepted" | "declined";

/**
 * Provider updates an application's status. Authorization is enforced in the
 * SECURITY DEFINER RPC: only the owner of the listing the application targets
 * may change status, and only to a whitelisted value.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: Exclude<ApplicationStatus, "pending">
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("update_application_status", {
    p_application_id: applicationId,
    p_status: status,
  });
  return { error: error ? "We couldn't update that application — try again?" : null };
}

/* ------------------------------ commerce ------------------------------ */

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "refunded";

export interface OrderView {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountMinor: number;
  platformFeeMinor: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface EntitlementView {
  id: string;
  orderId: string;
  granteeId: string;
  kind: "unlocked_conversation" | "featured_promotion" | "verified_listing";
  grantedAt: string;
}

interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_minor: number | string;
  platform_fee_minor: number | string;
  currency: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
}

interface EntitlementRow {
  id: string;
  order_id: string;
  grantee_id: string;
  kind: EntitlementView["kind"];
  granted_at: string;
}

const toOrderView = (r: OrderRow): OrderView => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  sellerId: r.seller_id,
  amountMinor: num(r.amount_minor),
  platformFeeMinor: num(r.platform_fee_minor),
  currency: r.currency,
  status: r.status,
  createdAt: r.created_at,
  paidAt: r.paid_at,
});

/**
 * Create a purchase intent for a listing. The SECURITY DEFINER RPC derives
 * amount + platform fee + ownership server-side; the client can never send
 * an amount, fee, or status. `idempotencyKey` (optional) prevents double
 * orders on retry — a client-generated value, enforced by a unique column.
 */
export async function createOrder(
  listingId: string,
  idempotencyKey?: string
): Promise<{ order?: OrderView; error?: string }> {
  const { data, error } = await supabase.rpc("create_order", {
    p_listing_id: listingId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error || !data) return { error: "We couldn't start that order — try again?" };
  return { order: toOrderView(data as OrderRow) };
}

/** The signed-in user's orders (RLS: buyer or seller). Client is read-only. */
export async function myOrders(meId: string): Promise<OrderView[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_id.eq.${meId},seller_id.eq.${meId}`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as OrderRow[]).map(toOrderView);
}

/** Entitlements granted to the signed-in user (server-derived after payment). */
export async function myEntitlements(meId: string): Promise<EntitlementView[]> {
  const { data, error } = await supabase
    .from("entitlements")
    .select("id, order_id, grantee_id, kind, granted_at")
    .eq("grantee_id", meId)
    .order("granted_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as EntitlementRow[]).map((r) => ({
    id: r.id,
    orderId: r.order_id,
    granteeId: r.grantee_id,
    kind: r.kind,
    grantedAt: r.granted_at,
  }));
}

/** Public commerce config (e.g. platform fee rate) — read-only, anon-visible. */
export async function commerceConfig(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("commerce_config").select("key, value");
  if (error) return {};
  const out: Record<string, unknown> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    out[row.key] = row.value;
  }
  return out;
}
