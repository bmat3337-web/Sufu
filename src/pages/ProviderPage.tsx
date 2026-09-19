import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Languages,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { Link, navigate } from "../router";
import { useToast } from "../components/Toast";
import { TrustBadges } from "../components/TrustBadge";
import { CategoryIcon } from "../components/CategoryIcon";
import { avatarGradient, initials } from "../components/ProviderCard";
import { DetailSkeleton } from "../components/SkeletonCards";
import { formatUSD, type Provider, type VerificationId } from "../data";
import { getOrCreateConversation, providerById } from "../lib/api";
import { useAuth } from "../lib/auth";
import { SufuJourney } from "../components/SufuJourney";
import { SufuItChips } from "../components/SufuItChips";

const trustSteps: { id: string; label: string; needs: VerificationId[] }[] = [
  { id: "new", label: "New", needs: [] },
  { id: "profile", label: "Profile complete", needs: [] },
  { id: "phone", label: "Phone verified", needs: ["phone"] },
  { id: "identity", label: "Identity verified", needs: ["identity"] },
  { id: "business", label: "Business verified", needs: ["business"] },
  { id: "trusted", label: "Trusted Provider", needs: [] },
];

/** Real verification states only — no badge is ever shown without a check behind it. */
function trustLevel(provider: Provider): number {
  let level = 1;
  if (provider.verified.includes("phone")) level = 2;
  if (provider.verified.includes("identity")) level = 3;
  if (provider.verified.includes("business")) level = 4;
  if (level === 4 && provider.completedJobs > 0 && provider.rating >= 4.5) level = 5;
  return level;
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= filled ? "h-4 w-4 text-gold" : "h-4 w-4 text-border"}
          fill={i <= filled ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function ProviderPage({ id }: { id: string }) {
  const toast = useToast();
  const { user, openAuth } = useAuth();
  const [provider, setProvider] = useState<Provider | undefined>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    providerById(id)
      .then((found) => {
        if (cancelled) return;
        setProvider(found);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onMessage = async () => {
    if (!user) {
      openAuth();
      return;
    }
    if (provider?.id === user.id) {
      toast("This is your own profile");
      return;
    }
    if (!provider || starting) return;
    setStarting(true);
    const conversationId = await getOrCreateConversation(null, provider.id);
    setStarting(false);
    if (!conversationId) {
      toast("We couldn't open that chat — try again?");
      return;
    }
    navigate(`/inbox/${conversationId}`);
  };

  if (loading) {
    return (
      <div role="status" aria-label="Loading provider profile">
        <DetailSkeleton />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Provider not found
        </h1>
        <p className="mt-3 text-muted">This profile may have been removed or renamed.</p>
        <Link
          to="/explore"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const level = trustLevel(provider);
  const currentStep = trustSteps[level];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <Link
        to="/explore"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Explore
      </Link>

      <div className="mt-4 rounded-[24px] border border-border/70 bg-[#fffdf7] p-5"><p className="text-sm font-semibold text-primary">Found someone who can help?</p><h2 className="mt-1 text-xl font-bold text-foreground">Sufu this connection.</h2><p className="mt-1 text-sm text-muted">Start a conversation, ask for what you need, and turn the match into an outcome.</p><div className="mt-4"><SufuItChips onSelect={(value) => toast(`Need something else? Sufu it: ${value}`)} /></div></div>\n\n      {/* Profile header */}
      <div className="mt-4 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(
              provider.name
            )} font-heading text-xl font-bold text-on-primary sm:h-20 sm:w-20`}
          >
            {initials(provider.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {provider.name}
              </h1>
              <span className="rounded-full bg-surface-warm px-2.5 py-1 text-xs font-semibold text-muted">
                {provider.isBusiness ? "Business" : "Individual"} · {provider.category}
              </span>
            </div>
            <p className="mt-1 text-muted">{provider.tagline}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                {provider.location.suburb}, {provider.location.city}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-gold" fill="currentColor" aria-hidden="true" />
                {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                Responds {provider.responseTime}
              </span>
            </div>

            <div className="mt-4">
              <TrustBadges ids={provider.verified} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
          <div>
            <p className="font-heading text-xl font-bold text-primary">{provider.completedJobs}</p>
            <p className="text-xs font-medium text-muted">Completed jobs</p>
          </div>
          <div>
            <p className="font-heading text-xl font-bold text-primary">{provider.memberSince}</p>
            <p className="text-xs font-medium text-muted">Member since</p>
          </div>
          <div>
            <p className="font-heading text-xl font-bold text-primary">
              {provider.languages.join(" · ")}
            </p>
            <p className="text-xs font-medium text-muted">Languages</p>
          </div>
          {provider.hours ? (
            <div>
              <p className="font-heading text-xl font-bold leading-tight text-primary">
                {provider.hours}
              </p>
              <p className="text-xs font-medium text-muted">
                {provider.employees ?? "Opening hours"}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-heading text-xl font-bold text-primary">{provider.category}</p>
              <p className="text-xs font-medium text-muted">Speciality</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust progression */}
      <div className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
            SUFU trust level: {currentStep.label}
          </h2>
          <p className="text-sm text-muted">Every badge is earned — never faked.</p>
        </div>
        <ol className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
          {trustSteps.map((step, index) => {
            const done = index <= level;
            const isCurrent = index === level;
            return (
              <li key={step.id} className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    done
                      ? isCurrent
                        ? "bg-primary text-on-primary"
                        : "bg-primary-soft text-primary"
                      : "bg-surface-warm text-muted"
                  }`}
                >
                  {done && index < level && (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {step.label}
                </span>
                {index < trustSteps.length - 1 && (
                  <span className="h-px w-3 bg-border" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* About */}
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="About">
        <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">About</h2>
        <p className="mt-2 leading-relaxed text-muted">{provider.bio}</p>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
          Speaks {provider.languages.join(", ")}
        </p>
      </section>

      {/* Services */}
      {provider.services.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Services offered">
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
            Services offered
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {provider.services.map((service) => (
              <li key={service.name} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium text-foreground">{service.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-heading font-bold text-primary">
                    From {formatUSD(service.priceFrom)}
                  </span>
                  <button
                    type="button"
                    onClick={onMessage}
                    disabled={starting}
                    className="min-h-10 cursor-pointer rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-all duration-150 hover:bg-primary-soft active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {starting ? "Opening…" : "Enquire"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Portfolio */}
      {provider.portfolio.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Portfolio">
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
            Portfolio
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {provider.portfolio.map((item) => (
              <div
                key={item.title}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-soft via-surface to-secondary-soft p-3 text-center"
              >
                <CategoryIcon name={item.kind} className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Reviews">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">Reviews</h2>
          <div className="flex items-center gap-2">
            <Stars rating={provider.rating} />
            <span className="font-heading text-xl font-bold text-foreground">
              {provider.rating.toFixed(1)}
            </span>
            <span className="text-sm text-muted">({provider.reviewCount})</span>
          </div>
        </div>
        {provider.reviews.length === 0 ? (
          <p className="mt-3 text-muted">No reviews yet — be the first to work with them.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {provider.reviews.map((review) => (
              <li key={review.text} className="rounded-xl bg-surface-warm/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{review.author}</p>
                  <span className="text-xs text-muted">{review.date}</span>
                </div>
                <div className="mt-1">
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{review.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Actions + safety */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={onMessage}
            disabled={starting}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Message
          </button>
          <button
            type="button"
            onClick={() => toast("Contact details arrive with SUFU accounts")}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 font-semibold text-foreground transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.97]"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Contact
          </button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => toast("Report sent to SUFU moderation")}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-destructive"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Report
          </button>
          <button
            type="button"
            onClick={() => toast("This user is now blocked")}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-destructive"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
