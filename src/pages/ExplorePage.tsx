import { useEffect, useState, type FormEvent } from "react";
import { LocateFixed, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link, navigate, useRoute } from "../router";
import ListingCard from "../components/ListingCard";
import ProviderCard from "../components/ProviderCard";
import LocationPicker from "../components/LocationPicker";
import { ListingCardSkeleton, ProviderCardSkeleton } from "../components/SkeletonCards";
import { categoryGroups, type Group, type Listing, type Provider, type SortKey } from "../data";
import { fetchCategories, providersByIds, searchProviders } from "../lib/api";
import { discoverListings } from "../lib/discovery";
import { SufuJourney } from "../components/SufuJourney";

const typeTabs = [{ id: "all", label: "All" }, ...categoryGroups.map((g) => ({ id: g.id, label: g.label }))];
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price · low to high" },
  { value: "price-desc", label: "Price · high to low" },
  { value: "rating", label: "Top rated" },
];

export default function ExplorePage() {
  const { params } = useRoute();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [group, setGroup] = useState(params.get("group") ?? "all");
  const [city, setCity] = useState(params.get("city") ?? "Harare");
  const [suburb, setSuburb] = useState(params.get("suburb") ?? "");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) ?? "newest");
  const [radiusKm, setRadiusKm] = useState(Number(params.get("radius") ?? 25));
  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerMap, setProviderMap] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState(true);
  const [chipCategories, setChipCategories] = useState<{ name: string; group: Group }[]>([]);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setGroup(params.get("group") ?? "all");
    setCity(params.get("city") ?? "Harare");
    setSuburb(params.get("suburb") ?? "");
    setSort((params.get("sort") as SortKey) ?? "newest");
    setRadiusKm(Number(params.get("radius") ?? 25));
  }, [params]);

  useEffect(() => {
    let active = true;
    fetchCategories().then((cats) => active && setChipCategories(cats)).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const showBusinesses = group === "businesses";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const [listingRes, providerRes] = await Promise.all([
        showBusinesses
          ? Promise.resolve<Listing[]>([])
          : discoverListings({
              q: query,
              group: group === "all" ? undefined : (group as Group),
              city,
              suburb,
              sort,
              latitude: coords?.latitude,
              longitude: coords?.longitude,
              radiusKm: nearMe ? radiusKm : undefined,
            }),
        showBusinesses ? searchProviders({ q: query, group: "businesses", city, suburb }) : Promise.resolve<Provider[]>([]),
      ]);
      if (cancelled) return;
      setListings(listingRes);
      setProviders(providerRes);
      const provs = await providersByIds(listingRes.map((l) => l.providerId));
      if (cancelled) return;
      setProviderMap(Object.fromEntries(provs.map((p) => [p.id, p])));
      setLoading(false);
    }
    load().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [query, group, city, suburb, sort, showBusinesses, coords, nearMe, radiusKm]);

  const count = listings.length + providers.length;
  const visibleChips = group === "all" ? [] : chipCategories.filter((c) => c.group === group);

  function sync(next: { q?: string; group?: string; city?: string; suburb?: string; sort?: SortKey; radius?: number }) {
    const p = new URLSearchParams();
    const q = next.q ?? query;
    const g = next.group ?? group;
    const c = next.city ?? city;
    const s = next.suburb ?? suburb;
    const so = next.sort ?? sort;
    const r = next.radius ?? radiusKm;
    if (q.trim()) p.set("q", q.trim());
    if (g !== "all") p.set("group", g);
    if (c) p.set("city", c);
    if (s) p.set("suburb", s);
    p.set("sort", so);
    if (nearMe) p.set("radius", String(r));
    navigate(`/explore?${p.toString()}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); sync({ q: query }); }
  function updateGroup(value: string) { setGroup(value); sync({ group: value }); }
  function updateLocation(loc: { city: string; suburb: string }) { setCity(loc.city); setSuburb(loc.suburb); setNearMe(false); sync({ city: loc.city, suburb: loc.suburb }); }
  function updateSort(value: SortKey) { setSort(value); sync({ sort: value }); }

  function useCurrentLocation() {
    setLocationError(null);
    if (!navigator.geolocation) { setLocationError("Location is not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setNearMe(true);
      },
      () => setLocationError("Location permission was not granted. Choose a location manually instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function clearFilters() {
    setQuery(""); setGroup("all"); setCity("Harare"); setSuburb(""); setSort("newest");
    setNearMe(false); setCoords(null); setLocationError(null); setRadiusKm(25); navigate("/explore");
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><SufuJourney stage="matched" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Explore SUFU</h1><p className="mt-1 text-muted">Services, products, jobs and businesses — all around you.</p></div>
        <Link to="/post" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"><Plus className="h-4 w-4" aria-hidden="true" />Post</Link>
      </div>

      <form onSubmit={submitSearch} role="search" className="mt-6">
        <label htmlFor="explore-search" className="sr-only">Search SUFU</label>
        <div className="flex gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
          <div className="flex flex-1 items-center gap-2.5 px-3"><Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" /><input id="explore-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services, products, jobs…" className="w-full bg-transparent py-2 text-base text-foreground placeholder:text-muted/70 focus:outline-none" /></div>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary">Search</button>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {typeTabs.map((tab) => <button key={tab.id} type="button" aria-pressed={group === tab.id} onClick={() => updateGroup(tab.id)} className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-semibold ${group === tab.id ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-foreground hover:border-primary/50"}`}>{tab.label}</button>)}
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <LocationPicker value={{ city, suburb }} onChange={updateLocation} idPrefix="explore" compact />
        <button type="button" onClick={useCurrentLocation} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${nearMe ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-foreground"}`}><LocateFixed className="h-4 w-4" aria-hidden="true" />{nearMe ? "Near me" : "Use my location"}</button>
        {nearMe && <select value={radiusKm} onChange={(e) => { const r = Number(e.target.value); setRadiusKm(r); sync({ radius: r }); }} aria-label="Search radius" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option><option value={100}>100 km</option></select>}
        <div className="ml-auto flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" /><select value={sort} onChange={(e) => updateSort(e.target.value as SortKey)} aria-label="Sort results" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">{sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      </div>
      {locationError && <p className="mt-3 text-sm text-muted" role="alert">{locationError}</p>}

      {visibleChips.length > 0 && <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">{visibleChips.map((cat) => <button key={cat.name} type="button" onClick={() => { setQuery(cat.name); sync({ q: cat.name }); }} className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:border-primary/50 hover:text-primary">{cat.name}</button>)}</div>}
      <p className="mt-6 text-sm text-muted" role="status">{count} {count === 1 ? "result" : "results"}{nearMe ? ` within ${radiusKm} km` : city ? ` in ${city}` : ""}{suburb ? ` · ${suburb}` : ""}</p>

      {loading && count === 0 ? <div className="mt-3 grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading results">{Array.from({ length: 4 }, (_, i) => showBusinesses ? <ProviderCardSkeleton key={i} /> : <ListingCardSkeleton key={i} />)}</div> : count > 0 ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{showBusinesses ? providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />) : listings.map((listing) => <ListingCard key={listing.id} listing={listing} provider={providerMap[listing.providerId]} />)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center"><Search className="mx-auto h-7 w-7 text-muted" aria-hidden="true" /><h2 className="mt-5 font-heading text-2xl font-bold tracking-tight text-foreground">Nothing matched that search</h2><p className="mx-auto mt-2 max-w-sm text-muted">Try a broader word, or clear the filters — your match is out there somewhere.</p><button type="button" onClick={clearFilters} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-primary bg-surface px-6 py-2.5 font-semibold text-primary">Clear filters</button></div>}
    </div>
  );
}
