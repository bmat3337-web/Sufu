import { useEffect, useRef, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { SufuLogo } from "./SufuLogo";
import { Link, useRoute } from "../router";
import { isSupabaseConfigured } from "../lib/supabase";

const navLinks = [
  { label: "Explore", to: "/explore" },
  { label: "How it works", to: "#how-it-works" },
  { label: "Contact", to: "#contact" },
];

function isAnchor(to: string) {
  return to.startsWith("#");
}

export default function Header() {
  const { path } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    triggerRef.current?.focus();
  }

  // Close on Escape and lock body scroll while the drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  // Trap focus inside the drawer while open
  useEffect(() => {
    if (!menuOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const exploreActive = path.startsWith("/explore");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <a href="#top" className="flex cursor-pointer items-center" aria-label="SUFU home">
          <SufuLogo className="h-8 w-auto" />
        </a>

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = link.to === "/explore" && exploreActive;
              const className = `inline-block cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 hover:bg-surface-warm hover:text-primary ${
                active ? "bg-surface-warm text-primary" : "text-foreground"
              }`;
              return (
                <li key={link.label}>
                  {isAnchor(link.to) ? (
                    <a href={link.to} className={className}>
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className={className}>
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/post"
            className="hidden min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] sm:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post
          </Link>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-border text-foreground transition-colors duration-150 hover:bg-surface-warm md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-in drawer. Keep this outside any backdrop-filter/transform
          containing block so fixed positioning uses the actual viewport. */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-[60] md:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        {/* Scrim */}
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-charcoal/50 backdrop-blur-sm transition-opacity duration-250 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          tabIndex={-1}
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-background shadow-xl shadow-charcoal/20 transition-[transform,visibility] duration-250 motion-reduce:transition-none ${
            menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <span id="mobile-menu-title" className="sr-only">
              Menu
            </span>
            <a
              href="#top"
              onClick={closeMenu}
              className="flex cursor-pointer items-center"
              aria-label="SUFU home"
            >
              <SufuLogo className="h-8 w-auto" />
            </a>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-warm hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.label}>
                  {isAnchor(link.to) ? (
                    <a
                      href={link.to}
                      onClick={closeMenu}
                      className="block cursor-pointer rounded-xl px-4 py-3 text-base font-medium text-foreground transition-colors duration-150 hover:bg-surface-warm hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.to}
                      onClick={closeMenu}
                      className="block cursor-pointer rounded-xl px-4 py-3 text-base font-medium text-foreground transition-colors duration-150 hover:bg-surface-warm hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <Link
              to="/post"
              onClick={closeMenu}
              className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Post on SUFU
            </Link>
          </nav>
        </div>
      </div>

      {/* Preview mode — backend env vars not configured */}
      {!isSupabaseConfigured && (
        <div className="border-t border-border bg-surface-warm/70 px-5 py-1.5 text-center">
          <p className="text-xs font-medium text-muted">
            Preview mode — live data isn't connected. Add{" "}
            <code className="rounded bg-background px-1 py-0.5 font-mono text-[0.7rem] text-foreground">VITE_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="rounded bg-background px-1 py-0.5 font-mono text-[0.7rem] text-foreground">VITE_SUPABASE_ANON_KEY</code>{" "}
            in Environment settings to go live.
          </p>
        </div>
      )}
    </header>
  );
}
