import { useState, type FormEvent } from "react";
import { Search, Sparkles } from "lucide-react";
import { navigate } from "../router";
import LocationPicker from "./LocationPicker";
import type { Location } from "../data";
import { SUFU_LANGUAGE } from "../lib/sufuLanguage";

const examples = ["plumber in Avondale", "second-hand fridge", "logo under $50", "delivery driver"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Hero() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<Location>({ city: "Harare", suburb: "Avondale" });
  function go(queryValue: string, loc: Location) {
    const params = new URLSearchParams();
    if (queryValue.trim()) params.set("q", queryValue.trim());
    if (loc.city) params.set("city", loc.city);
    if (loc.suburb) params.set("suburb", loc.suburb);
    navigate(`/explore?${params.toString()}`);
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); go(query, location); }
  return <section className="bg-hero-glow dot-grid relative overflow-hidden">
    <div className="mx-auto max-w-6xl px-5 pb-14 pt-12 sm:pt-16 lg:px-8 lg:pb-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-sm font-medium text-primary"><Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />Harare · Bulawayo · Zimbabwe — more cities soon</p>
        <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">{greeting()}.<br /><span className="text-primary">Need something? Sufu it.</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">{SUFU_LANGUAGE.promise}</p>
        <form onSubmit={handleSubmit} role="search" className="mt-8">
          <label htmlFor="sufu-search" className="sr-only">Search SUFU</label>
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-lg shadow-foreground/5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2.5 px-3"><Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" /><input id="sufu-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="What do you need? e.g. plumber in Avondale" className="w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted/70 focus:outline-none" /></div>
            <div className="flex items-center justify-between gap-1 border-border sm:border-l sm:px-2"><LocationPicker value={location} onChange={setLocation} idPrefix="hero" compact /></div>
            <button type="submit" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]">Sufu it</button>
          </div>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2"><span className="text-sm font-medium text-muted">Try:</span>{examples.map(example=><button key={example} type="button" onClick={()=>go(example,location)} className="min-h-10 cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.97]">{example}</button>)}</div>
      </div>
    </div>
  </section>;
}