import { Compass, Home, Inbox, Plus, User, type LucideIcon } from "lucide-react";
import { Link } from "../router";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  primary?: boolean;
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/post", label: "Post", icon: Plus, primary: true },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/profile", label: "Profile", icon: User },
];

/** Mobile-first primary navigation (Home | Explore | + | Inbox | Profile). */
export default function BottomNav({ path }: { path: string }) {
  const isActive = (item: NavItem) =>
    item.end ? path === "/" || !path.startsWith("/") : path.startsWith(item.to);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.label} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex cursor-pointer flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] transition-colors duration-150 ${
                  active ? "font-semibold text-primary" : "font-medium text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`flex items-center justify-center transition-all duration-150 ${
                    item.primary
                      ? "h-11 w-11 -translate-y-3 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 hover:bg-primary-bright active:scale-[0.95]"
                      : active
                        ? "h-8 w-14 rounded-full bg-primary-soft"
                        : "h-8 w-14"
                  }`}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
