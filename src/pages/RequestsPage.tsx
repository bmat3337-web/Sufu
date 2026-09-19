import { useEffect, useState } from "react";
import { Link } from "../router";
import { MapPin, Search, Send } from "lucide-react";
import LocationPicker from "../components/LocationPicker";
import { discoverRequests, type RequestCategory, type SufuRequest } from "../lib/requests";
import { SufuJourney } from "../components/SufuJourney";

const types: { id: RequestCategory | "all"; label: string }[] = [
  { id: "all", label: "All needs" }, { id: "service", label: "Services" },
  { id: "product", label: "Products" }, { id: "job", label: "Work" }, { id: "business", label: "Business" },
];

export default function RequestsPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Harare");
  const [suburb, setSuburb] = useState("");
  const [type, setType] = useState<RequestCategory | "all">("all");
  const [requests, setRequests] = useState<SufuRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false; setLoading(true);
    discoverRequests({ q, city, suburb, requestType: type === "all" ? undefined : type })
      .then((rows) => { if (!cancelled) setRequests(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, city, suburb, type]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><SufuJourney stage="need" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">People need this</h1><p className="mt-1 text-muted">Find open requests and turn demand into your next opportunity.</p></div>
        <Link to="/request" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary"><Send className="h-4 w-4" />Post a request</Link>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="h-4 w-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What are people looking for?" className="w-full bg-transparent py-3 text-foreground outline-none" /></div>
          <LocationPicker value={{ city, suburb }} onChange={(v) => { setCity(v.city); setSuburb(v.suburb); }} idPrefix="requests" compact />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{types.map((item) => <button key={item.id} type="button" onClick={() => setType(item.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${type === item.id ? "border-primary bg-primary text-on-primary" : "border-border bg-background text-foreground"}`}>{item.label}</button>)}</div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl border border-border bg-surface" />) : requests.map((request) => (
          <article key={request.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{request.requestType}</span><span className="text-xs text-muted">Open</span></div>
            <h2 className="mt-4 font-heading text-xl font-bold text-foreground">{request.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{request.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{request.suburb ? `${request.suburb}, ` : ""}{request.city}</span>{request.budget != null && <span>{request.currency} {request.budget.toLocaleString()}</span>}</div>
            <div className="mt-5 border-t border-border pt-4"><Link to={`/request/${request.id}`} className="text-sm font-semibold text-primary hover:underline">View request and respond →</Link></div>
          </article>
        ))}
      </div>
      {!loading && requests.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">No open requests matched these filters.</div>}
    </div>
  );
}
