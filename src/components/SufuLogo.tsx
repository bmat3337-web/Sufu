type SufuLogoProps = {
  /** "light" renders a silver wordmark for dark backgrounds, "dark" uses charcoal (cream backgrounds) */
  variant?: "dark" | "light";
  className?: string;
};

/**
 * SUFU mark: teal-gradient rounded tile with an "S" that flows into a gold
 * "match" dot — Need → Match → Connect. Interim recreation; user will swap
 * in the real logo files later.
 */
export function SufuMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="SUFU mark"
      focusable="false"
    >
      <defs>
        <linearGradient id="sufuMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#sufuMarkGrad)" />
      <path
        d="M15 16.5c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6c0 2.7-2 4.2-4.5 5.1-2.3.9-4.7 1.7-4.7 4.4 0 3 2.5 4.8 5.6 4.8 3 0 5.4-1.6 5.8-4.2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="32.5" cy="24.5" r="2.8" fill="#fbbf24" />
    </svg>
  );
}

export function SufuLogo({ variant = "dark", className = "" }: SufuLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SufuMark className="h-9 w-9 shrink-0" />
      <span
        className={`font-heading text-xl font-bold tracking-tight ${
          variant === "light"
            ? "bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent"
            : "text-foreground"
        }`}
      >
        SUFU
      </span>
    </span>
  );
}
