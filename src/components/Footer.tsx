import { SufuLogo } from "./SufuLogo";
import { Link } from "../router";

const exploreLinks = [
  { label: "Services", to: "/explore?group=services" },
  { label: "Marketplace", to: "/explore?group=marketplace" },
  { label: "Jobs", to: "/explore?group=jobs" },
  { label: "Businesses", to: "/explore?group=businesses" },
];

const sufuLinks = [
  { label: "How it works", to: "#how-it-works" },
  { label: "Post on SUFU", to: "/post" },
  { label: "One account", to: "/profile" },
  { label: "Safety & trust", to: "#how-it-works" },
];

export default function Footer() {
  return (
    <footer id="contact" className="scroll-mt-24 border-t border-border bg-surface-warm">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <SufuLogo className="h-8 w-auto" />
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">
              Need something? Sufu it.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The local-commerce and opportunity network for Harare — built to scale across
              Africa.
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="SUFU">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">SUFU</h3>
            <ul className="mt-4 space-y-2.5">
              {sufuLinks.map((link) => (
                <li key={link.label}>
                  {link.to.startsWith("#") ? (
                    <a
                      href={link.to}
                      className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.to}
                      className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Contact">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="mailto:hello@sufu.africa"
                  className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                >
                  hello@sufu.africa
                </a>
              </li>
              <li>
                <span className="text-sm text-muted">Harare, Zimbabwe</span>
              </li>
              <li>
                <a
                  href="https://wa.me/263770000000?text=Hello%20SUFU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                >
                  Find us on WhatsApp
                </a>
              </li>
              <li>
                <Link
                  to="/explore"
                  className="cursor-pointer text-sm text-muted transition-colors duration-150 hover:text-primary"
                >
                  Report a problem
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/70 pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p>© 2025 SUFU · Made in Harare, for Africa</p>
          <p>Photos: Unsplash</p>
        </div>
      </div>
    </footer>
  );
}
