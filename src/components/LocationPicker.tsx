import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { fetchCities, fetchCountries } from "../lib/api";
import type { Location } from "../data";

interface LocationPickerProps {
  value: Location;
  onChange: (location: Location) => void;
  idPrefix: string;
  compact?: boolean;
  className?: string;
}

/**
 * City + suburb picker following the combobox/listbox ARIA pattern:
 * trigger is role=combobox, options are listboxes navigable with arrow keys,
 * Escape closes, outside click closes, Enter on a suburb commits and closes.
 */
export default function LocationPicker({
  value,
  onChange,
  idPrefix,
  compact = false,
  className = "",
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<{ code: string; name: string; defaultCurrency: string }[]>([]);
  const [cities, setCities] = useState<{ name: string; suburbs: string[] }[]>([]);
  const [locationsError, setLocationsError] = useState(false);
  const [cityIndex, setCityIndex] = useState(0);
  const [suburbIndex, setSuburbIndex] = useState(0);
  const [countryCode, setCountryCode] = useState(value.countryCode ?? "ZW");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Live locations from Supabase — no static mock list.
  useEffect(() => {
    let active = true;
    Promise.all([fetchCountries(), fetchCities()])
      .then(([countryList, cityList]) => {
        if (!active) return;
        setCountries(countryList);
        setCities(cityList);
        setLocationsError(false);
      })
      .catch(() => {
        if (active) setLocationsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-sync the highlighted city once live locations arrive.
  useEffect(() => {
    const idx = cities.findIndex((c) => c.name === value.city);
    if (idx >= 0) setCityIndex(idx);
  }, [cities, value.city]);

  const city = cities[cityIndex] ?? cities[0];
  const suburbs = city?.suburbs ?? [];
  const shownSuburb =
    value.suburb && suburbs.includes(value.suburb) ? value.suburb : suburbs[suburbIndex] ?? "";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  function pickCountry(code: string) {
    setCountryCode(code);
    onChange({ ...value, countryCode: code, city: "", suburb: "" });
    setCityIndex(0);
    setSuburbIndex(0);
  }

  function pickCity(name: string) {
    const idx = cities.findIndex((c) => c.name === name);
    if (idx < 0) return;
    setCityIndex(idx);
    setSuburbIndex(0);
    onChange({ ...value, countryCode, city: name, suburb: cities[idx]?.suburbs[0] ?? "" });
  }

  function pickSuburb(name: string) {
    onChange({ ...value, countryCode, city: city.name, suburb: name });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleCityKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (cities.length === 0) return;
    const move = (next: number) => {
      event.preventDefault();
      pickCity(cities[next].name);
    };
    if (event.key === "ArrowDown") move((cityIndex + 1) % cities.length);
    else if (event.key === "ArrowUp") move((cityIndex - 1 + cities.length) % cities.length);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(cities.length - 1);
  }

  function handleSuburbKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (suburbs.length === 0) return;
    const move = (next: number) => {
      event.preventDefault();
      setSuburbIndex(next);
    };
    if (event.key === "ArrowDown") move((suburbIndex + 1) % suburbs.length);
    else if (event.key === "ArrowUp") move((suburbIndex - 1 + suburbs.length) % suburbs.length);
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (suburbs[suburbIndex]) pickSuburb(suburbs[suburbIndex]);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${idPrefix}-city-listbox`}
        aria-label="Choose location"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-medium text-foreground transition-colors duration-150 hover:text-primary ${
          compact ? "px-2 py-2" : "px-2 py-2.5"
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="max-w-[9rem] truncate sm:max-w-none">
          {countries.find((c) => c.code === countryCode)?.name ?? countryCode}{value.city ? ` · ${value.city}` : ""}
          {shownSuburb ? ` · ${shownSuburb}` : ""}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="animate-pop-in absolute left-0 z-30 mt-2 w-80 rounded-2xl border border-border bg-surface p-4 shadow-xl shadow-foreground/10"
          role="presentation"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Country</p>
          <select
            value={countryCode}
            onChange={(event) => pickCountry(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
            aria-label="Country"
          >
            {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">City</p>
          {cities.length === 0 ? (
            <p className="mt-2 text-sm text-muted" role="status">
              {locationsError
                ? "Couldn't load locations — check your connection and try again."
                : "Loading locations…"}
            </p>
          ) : (
            <ul
              id={`${idPrefix}-city-listbox`}
              role="listbox"
              aria-label="City"
              aria-activedescendant={`${idPrefix}-city-${cityIndex}`}
              tabIndex={0}
              onKeyDown={handleCityKey}
              className="mt-2 grid grid-cols-2 gap-1.5"
            >
              {cities.map((c, i) => (
                <li
                  key={c.name}
                  id={`${idPrefix}-city-${i}`}
                  role="option"
                  aria-selected={c.name === city.name}
                  onClick={() => pickCity(c.name)}
                  className={`flex cursor-pointer items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                    c.name === city.name
                      ? "bg-primary-soft text-primary"
                      : "text-foreground hover:bg-surface-warm"
                  }`}
                >
                  {c.name}
                  {c.name === city.name && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}

          {suburbs.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                Suburb
              </p>
              <ul
                id={`${idPrefix}-suburb-listbox`}
                role="listbox"
                aria-label="Suburb"
                aria-activedescendant={`${idPrefix}-suburb-${suburbIndex}`}
                tabIndex={0}
                onKeyDown={handleSuburbKey}
                className="mt-2 grid grid-cols-2 gap-1.5"
              >
                {suburbs.map((sub, i) => (
                  <li
                    key={sub}
                    id={`${idPrefix}-suburb-${i}`}
                    role="option"
                    aria-selected={sub === shownSuburb}
                    onClick={() => pickSuburb(sub)}
                    className={`flex cursor-pointer items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                      sub === shownSuburb
                        ? "bg-primary-soft text-primary"
                        : "text-foreground hover:bg-surface-warm"
                    }`}
                  >
                    {sub}
                    {sub === shownSuburb && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
