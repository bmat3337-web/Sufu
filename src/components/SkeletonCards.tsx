/* Lightweight card skeletons shown while live data loads.
 * aria-hidden — the container grid announces itself via role="status". */

export function ListingCardSkeleton() {
  return (
    <div
      className="flex animate-pulse gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
      aria-hidden="true"
    >
      <span className="h-24 w-24 shrink-0 rounded-xl bg-foreground/5 sm:h-28 sm:w-28" />
      <span className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <span className="h-4 w-16 rounded-full bg-foreground/5" />
        <span className="mt-1 h-4 w-3/4 rounded bg-foreground/5" />
        <span className="h-3 w-1/2 rounded bg-foreground/5" />
        <span className="mt-auto h-4 w-20 rounded bg-foreground/5" />
      </span>
    </div>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-border bg-surface p-4 shadow-sm"
      aria-hidden="true"
    >
      <span className="flex items-center gap-3">
        <span className="h-14 w-14 shrink-0 rounded-full bg-foreground/5" />
        <span className="flex flex-1 flex-col gap-2">
          <span className="h-4 w-2/3 rounded bg-foreground/5" />
          <span className="h-3 w-1/3 rounded bg-foreground/5" />
        </span>
      </span>
      <span className="mt-4 h-3 w-full rounded bg-foreground/5" />
      <span className="mt-2 h-3 w-5/6 rounded bg-foreground/5" />
      <span className="mt-4 flex items-center gap-2">
        <span className="h-3 w-16 rounded bg-foreground/5" />
        <span className="h-3 w-10 rounded bg-foreground/5" />
      </span>
    </div>
  );
}

/* Full-page skeleton for detail views (listing / provider). */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8" aria-hidden="true">
      <span className="block h-4 w-20 rounded bg-foreground/5" />
      <span className="mt-4 block h-52 animate-pulse rounded-3xl bg-foreground/5 sm:h-64" />
      <span className="mt-6 block h-7 w-3/4 animate-pulse rounded bg-foreground/5" />
      <span className="mt-3 block h-4 w-1/2 animate-pulse rounded bg-foreground/5" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <span className="block h-40 animate-pulse rounded-2xl bg-foreground/5" />
          <span className="block h-24 animate-pulse rounded-2xl bg-foreground/5" />
        </div>
        <span className="block h-48 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
    </div>
  );
}
