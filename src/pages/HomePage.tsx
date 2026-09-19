import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import ListingCard from "../components/ListingCard";
import ProviderCard from "../components/ProviderCard";
import SectionHeader from "../components/SectionHeader";
import EmptyState from "../components/EmptyState";
import { ListingCardSkeleton, ProviderCardSkeleton } from "../components/SkeletonCards";
import Tabs from "../components/Tabs";
import TrustSection from "../components/TrustSection";
import SellCta from "../components/SellCta";
import { SufuItChips } from "../components/SufuItChips";
import {
  businessProviders,
  latestOpportunities,
  popularForGroup,
  providersByIds,
  trustedProviders,
} from "../lib/api";
import { categoryGroups, type Group, type Listing, type Provider } from "../data";

const groupNoun: Record<Group, string> = {
  services: "services",
  marketplace: "marketplace items",
  jobs: "jobs",
  businesses: "businesses",
};

export default function HomePage() {
  const [activeGroup, setActiveGroup] = useState<Group>("services");
  const isBusinesses = activeGroup === "businesses";

  const [popular, setPopular] = useState<Listing[]>([]);
  const [businesses, setBusinesses] = useState<Provider[]>([]);
  const [trusted, setTrusted] = useState<Provider[]>([]);
  const [latest, setLatest] = useState<Listing[]>([]);
  const [providerMap, setProviderMap] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const [popularRes, businessRes, trustedRes, latestRes] = await Promise.all([
        isBusinesses ? Promise.resolve<Listing[]>([]) : popularForGroup(activeGroup),
        isBusinesses ? businessProviders() : Promise.resolve<Provider[]>([]),
        trustedProviders(isBusinesses ? "services" : activeGroup),
        latestOpportunities(4),
      ]);
      if (cancelled) return;
      setPopular(popularRes);
      setBusinesses(businessRes.slice(0, 6));
      setTrusted(trustedRes);
      setLatest(latestRes);
      const provs = await providersByIds([...popularRes, ...latestRes].map((l) => l.providerId));
      if (cancelled) return;
      setProviderMap(Object.fromEntries(provs.map((p) => [p.id, p])));
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeGroup, isBusinesses]);

  const providerOf = (id: string) => providerMap[id];

  return (
    <div>
      <Hero />

      <section id="categories" className="scroll-mt-20 border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <div className="mb-6 rounded-[24px] border border-border/60 bg-surface/70 p-4"><div className="mb-3 text-sm font-medium text-muted">Need something else?</div><SufuItChips onSelect={(value) => { window.location.href = `/explore?q=${encodeURIComponent(value)}`; }} /></div>

          <Tabs
            items={categoryGroups.map((g) => ({ id: g.id, label: g.label }))}
            active={activeGroup}
            onChange={(id) => setActiveGroup(id as Group)}
            label="Browse SUFU"
            idPrefix="home"
          />

          <div
            id="home-panel"
            role="tabpanel"
            aria-labelledby={`home-tab-${activeGroup}`}
            className="mt-8 space-y-12"
          >
            <section aria-label="Popular near you">
              <SectionHeader
                eyebrow="Near you"
                title="Popular near you"
                to={`/explore?group=${activeGroup}`}
              />
              {isBusinesses ? (
                loading ? (
                  <div
                    className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    role="status"
                    aria-label="Loading businesses"
                  >
                    {[0, 1, 2].map((i) => (
                      <ProviderCardSkeleton key={i} />
                    ))}
                  </div>
                ) : businesses.length > 0 ? (
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {businesses.map((provider, i) => (
                      <div
                        key={provider.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${i * 45}ms` }}
                      >
                        <ProviderCard provider={provider} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="No businesses on SUFU yet — be the first to list yours."
                    cta="List your business"
                    to="/post"
                  />
                )
              ) : loading ? (
                <div
                  className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"
                  role="status"
                  aria-label="Loading popular listings"
                >
                  {[0, 1].map((i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              ) : popular.length > 0 ? (
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  {popular.map((listing, i) => (
                    <div
                      key={listing.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <ListingCard listing={listing} provider={providerOf(listing.providerId)} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message={`No ${groupNoun[activeGroup]} near you yet.`}
                  cta="Post one"
                  to="/post"
                />
              )}
            </section>

            <section aria-label="Trusted providers">
              <SectionHeader
                eyebrow="Trust first"
                title="Trusted providers"
                to={`/explore?group=${isBusinesses ? "services" : activeGroup}`}
              />
              {loading ? (
                <div
                  className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  role="status"
                  aria-label="Loading trusted providers"
                >
                  {[0, 1, 2].map((i) => (
                    <ProviderCardSkeleton key={i} />
                  ))}
                </div>
              ) : trusted.length > 0 ? (
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {trusted.map((provider, i) => (
                    <div
                      key={provider.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <ProviderCard provider={provider} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No trusted providers here yet — top-rated pros appear here as they join." />
              )}
            </section>

            <section aria-label="Latest opportunities">
              <SectionHeader eyebrow="Fresh on SUFU" title="Latest opportunities" to="/explore" />
              {loading ? (
                <div
                  className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"
                  role="status"
                  aria-label="Loading latest opportunities"
                >
                  {[0, 1].map((i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              ) : latest.length > 0 ? (
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  {latest.map((listing, i) => (
                    <div
                      key={listing.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <ListingCard listing={listing} provider={providerOf(listing.providerId)} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message="Nothing posted yet — be the first to share an opportunity."
                  cta="Post one"
                  to="/post"
                />
              )}
            </section>
          </div>
        </div>
      </section>

      <TrustSection />
      <SellCta />
    </div>
  );
}
