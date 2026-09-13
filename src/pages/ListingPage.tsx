import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Link, navigate } from "../router";
import { useToast } from "../components/Toast";
import { CategoryIcon } from "../components/CategoryIcon";
import { avatarGradient, initials } from "../components/ProviderCard";
import { DetailSkeleton } from "../components/SkeletonCards";
import { formatUSD, timeAgo, type Listing, type Provider } from "../data";
import {
  applyToJob,
  getOrCreateConversation,
  hasApplied,
  incrementViews,
  isListingSaved,
  listingById,
  providerById,
  toggleSavedListing,
} from "../lib/api";
import { useAuth } from "../lib/auth";

const typeLabel = { service: "Service", product: "For sale", job: "Job" } as const;

export default function ListingPage({ id }: { id: string }) {
  const toast = useToast();
  const { user, loading: authLoading, openAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState<"message" | "apply" | "save" | null>(null);
  const [listing, setListing] = useState<Listing | undefined>();
  const [provider, setProvider] = useState<Provider | undefined>();
  const [loading, setLoading] = useState(true);
  const countedId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListing(undefined);
    setProvider(undefined);
    async function load() {
      const found = await listingById(id);
      if (cancelled) return;
      setListing(found);
      if (found) {
        const prov = await providerById(found.providerId);
        if (cancelled) return;
        setProvider(prov);
      }
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Count a view once per page visit — never for the listing owner.
  useEffect(() => {
    if (authLoading || !listing || countedId.current === listing.id) return;
    countedId.current = listing.id;
    if (user?.id === listing.providerId) return;
    void incrementViews(listing.id, user?.id ?? null);
  }, [listing, user?.id, authLoading]);

  // Persisted save + application state, loaded once per signed-in visit.
  useEffect(() => {
    if (authLoading || !user || !listing) return;
    let cancelled = false;
    void Promise.all([isListingSaved(user.id, listing.id), hasApplied(listing.id, user.id)]).then(
      ([savedNow, appliedNow]) => {
        if (cancelled) return;
        setSaved(savedNow);
        setApplied(appliedNow);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [listing, user?.id, authLoading]);

  const requireAuth = (): boolean => {
    if (!user) {
      openAuth();
      return false;
    }
    return true;
  };

  const onMessage = async () => {
    if (!requireAuth() || !listing || !provider || !user) return;
    if (busy) return;
    setBusy("message");
    const conversationId = await getOrCreateConversation(listing.id, provider.id);
    setBusy(null);
    if (!conversationId) {
      toast("We couldn't open that chat — try again?");
      return;
    }
    navigate(`/inbox/${conversationId}`);
  };

  const onApply = async () => {
    if (!requireAuth() || !listing || !user) return;
    if (busy) return;
    setBusy("apply");
    const res = await applyToJob(listing.id, user.id);
    setBusy(null);
    if (res.error) {
      toast("We couldn't send your application — try again?");
      return;
    }
    setApplied(true);
    toast("Application sent — good luck!");
  };

  const onToggleSave = async () => {
    if (!requireAuth() || !listing || !user) return;
    if (busy) return;
    setBusy("save");
    const res = await toggleSavedListing(user.id, listing.id);
    setBusy(null);
    if (res.error) {
      toast("We couldn't update that — try again?");
      return;
    }
    setSaved(res.saved);
    toast(res.saved ? "Saved — we'll keep it here for you" : "Removed from saved listings");
  };

  if (loading) {
    return (
      <div role="status" aria-label="Loading listing">
        <DetailSkeleton />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Listing not found
        </h1>
        <p className="mt-3 text-muted">
          We couldn't find that listing — it may have been removed or sold.
        </p>
        <Link
          to="/explore"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const price =
    listing.type === "job" ? listing.salaryLabel : formatUSD(listing.price ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <Link
        to="/explore"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Explore
      </Link>

      {/* Photo / hero tile */}
      <div className="relative mt-4 flex h-52 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary-soft via-surface to-secondary-soft sm:h-64">
        <CategoryIcon name={listing.category} className="h-16 w-16 text-primary sm:h-20 sm:w-20" />
        <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur">
          {typeLabel[listing.type]}
        </span>
        {listing.featured && (
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold text-charcoal">
            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
            Featured
          </span>
        )}
      </div>

      <div className="mt-6">
        <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
          {listing.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {listing.location.suburb}, {listing.location.city}
          </span>
          <span aria-hidden="true">·</span>
          <span>Posted {timeAgo(listing.postedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {listing.views.toLocaleString("en-US")} views
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="font-heading text-3xl font-bold text-primary">{price}</p>
          {listing.condition && (
            <span className="rounded-full bg-surface-warm px-3 py-1 text-sm font-semibold text-muted">
              {listing.condition}
            </span>
          )}
          {listing.employmentType && (
            <span className="rounded-full bg-surface-warm px-3 py-1 text-sm font-semibold text-muted">
              {listing.employmentType}
            </span>
          )}
          {listing.remote && (
            <span className="rounded-full bg-secondary-soft px-3 py-1 text-sm font-semibold text-secondary">
              Remote
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Description">
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
              Description
            </h2>
            <p className="mt-2 leading-relaxed text-muted">{listing.description}</p>
            {listing.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {listing.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {provider && (
            <Link
              to={`/provider/${provider.id}`}
              className="mt-4 block cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {listing.type === "job" ? "Employer" : "Posted by"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                    provider.name
                  )} font-heading text-sm font-bold text-on-primary`}
                >
                  {initials(provider.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-foreground group-hover:text-primary">
                      {provider.name}
                    </span>
                    {provider.verified.includes("business") && (
                      <>
                        <BadgeCheck className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                        <span className="sr-only">Business verified</span>
                      </>
                    )}
                    {provider.verified.includes("identity") && (
                      <>
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="sr-only">Identity verified</span>
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-gold" fill="currentColor" aria-hidden="true" />
                      {provider.rating.toFixed(1)} ({provider.reviewCount})
                    </span>
                    {provider.completedJobs > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        {provider.completedJobs} jobs done
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {provider.responseTime}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-primary">View profile</span>
              </div>
            </Link>
          )}

          <p className="mt-4 text-sm text-muted">
            Stay safe: agree prices in person, inspect items before paying, and report anything
            suspicious to SUFU moderation.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            {listing.type === "job" ? (
              listing.providerId === user?.id ? (
                <p className="rounded-full bg-surface-warm px-4 py-3 text-center text-sm font-semibold text-muted">
                  This is your job listing
                </p>
              ) : applied ? (
                <p className="flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-3 text-center text-sm font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Application sent
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onApply}
                  disabled={busy === "apply"}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "apply" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                  )}
                  Apply for this job
                </button>
              )
            ) : listing.providerId === user?.id ? (
              <p className="rounded-full bg-surface-warm px-4 py-3 text-center text-sm font-semibold text-muted">
                This is your listing
              </p>
            ) : (
              <button
                type="button"
                onClick={onMessage}
                disabled={busy === "message"}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "message" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                )}
                Message {listing.type === "product" ? "seller" : "provider"}
              </button>
            )}
            {listing.providerId !== user?.id && (
              <button
                type="button"
                aria-pressed={saved}
                onClick={onToggleSave}
                disabled={busy === "save"}
                className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-6 py-3 font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                  saved
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {busy === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Heart className="h-4 w-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
                )}
                {saved ? "Saved" : "Save listing"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => toast("Report sent to SUFU moderation")}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition-colors duration-150 hover:text-destructive"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Report this listing
          </button>
        </div>
      </div>
    </div>
  );
}
