import { Star } from "lucide-react";
import { Link } from "../router";
import { formatUSD, timeAgo, type Listing, type Provider } from "../data";
import { CategoryIcon } from "./CategoryIcon";

const typeLabel: Record<Listing["type"], string> = {
  service: "Service",
  product: "For sale",
  job: "Job",
};

interface ListingCardProps {
  listing: Listing;
  provider?: Provider;
}

export default function ListingCard({ listing, provider }: ListingCardProps) {
  const price =
    listing.type === "job" ? (listing.salaryLabel ?? "See details") : formatUSD(listing.price ?? 0);

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <span className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-soft via-surface to-secondary-soft sm:h-28 sm:w-28">
        <CategoryIcon name={listing.category} className="h-9 w-9 text-primary" />
        {listing.featured && (
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-charcoal">
            <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" />
            <span className="sr-only">Featured</span>
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-surface-warm px-2 py-0.5 text-[11px] font-semibold text-muted">
            {typeLabel[listing.type]}
          </span>
          <span className="shrink-0 text-xs text-muted">{timeAgo(listing.postedAt)}</span>
        </span>
        <span className="mt-1.5 truncate font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {listing.title}
        </span>
        <span className="mt-0.5 truncate text-sm text-muted">
          {listing.category} · {listing.location.suburb}, {listing.location.city}
        </span>
        <span className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="font-heading text-base font-bold text-primary">{price}</span>
          {provider && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 text-gold" fill="currentColor" aria-hidden="true" />
              {provider.rating.toFixed(1)}
              <span className="hidden sm:inline">({provider.reviewCount})</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
