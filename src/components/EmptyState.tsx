import { Link } from "../router";

interface EmptyStateProps {
  message: string;
  cta?: string;
  to?: string;
}

/** Compact section-level empty state with an optional call to action. */
export default function EmptyState({ message, cta, to }: EmptyStateProps) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      {cta && to && (
        <Link
          to={to}
          className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-primary bg-surface px-5 py-2 text-sm font-semibold text-primary transition-all duration-150 ease-out hover:bg-primary-soft active:scale-[0.97]"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
