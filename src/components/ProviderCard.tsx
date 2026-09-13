import { BadgeCheck, MapPin, ShieldCheck, Star } from "lucide-react";
import { Link } from "../router";
import type { Provider } from "../data";

const gradients = [
  "from-primary to-secondary",
  "from-secondary to-gold",
  "from-primary-bright to-primary",
  "from-gold to-gold-deep",
];

/** Deterministic gradient per name so the same person always gets the same avatar. */
export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Link
      to={`/provider/${provider.id}`}
      className="group block cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
            provider.name
          )} font-heading text-sm font-bold text-on-primary`}
        >
          {initials(provider.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
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
          <span className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {provider.location.suburb}, {provider.location.city}
          </span>
        </span>
      </span>

      <span className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 font-semibold text-gold-deep">
          <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
          {provider.rating.toFixed(1)} ({provider.reviewCount})
        </span>
        {provider.completedJobs > 0 && (
          <span className="rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
            {provider.completedJobs} jobs done
          </span>
        )}
        <span className="rounded-full bg-surface-warm px-2.5 py-1 font-semibold text-muted">
          Responds {provider.responseTime}
        </span>
      </span>

      <span className="mt-2.5 line-clamp-2 block text-sm leading-relaxed text-muted">
        {provider.tagline}
      </span>
    </Link>
  );
}
