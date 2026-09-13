import { useRef, type KeyboardEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist, e.g. "Browse SUFU" */
  label: string;
  idPrefix: string;
}

/**
 * Accessible tabs: role=tablist/tab, arrow-key navigation (APG pattern).
 * Tab keys move to the active panel, which the page renders with role="tabpanel".
 */
export default function Tabs({ items, active, onChange, label, idPrefix }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function moveTo(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = items[nextIndex];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.map((item, index) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => moveTo(event, index)}
            className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
              selected
                ? "border-primary bg-primary text-on-primary shadow-sm"
                : "border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  selected ? "bg-on-primary/25 text-on-primary" : "bg-surface-warm text-muted"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
