import { ChevronRight } from "lucide-react";
import { Link } from "../router";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  to: string;
  linkLabel?: string;
}

export default function SectionHeader({ eyebrow, title, to, linkLabel = "See all" }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">{eyebrow}</p>
        )}
        <h2 className="mt-1 truncate font-heading text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
          {title}
        </h2>
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
      >
        {linkLabel}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
