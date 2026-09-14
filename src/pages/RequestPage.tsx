import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, HandCoins, MapPin, Send } from "lucide-react";
import { Link } from "../router";
import LocationPicker from "../components/LocationPicker";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { fetchCategories } from "../lib/api";
import { createRequest, type RequestCategory } from "../lib/requests";
import type { Group, Location } from "../data";

const options: { id: RequestCategory; title: string; body: string; group: Group }[] = [
  { id: "service", title: "Need a service", body: "Find someone who can do the work", group: "services" },
  { id: "product", title: "Need a product", body: "Tell sellers what you are looking for", group: "marketplace" },
  { id: "job", title: "Looking for work", body: "Share the work you want to find", group: "jobs" },
  { id: "business", title: "Need a business supplier", body: "Find a business partner or supplier", group: "businesses" },
];

export default function RequestPage() {
  const toast = useToast();
  const { user, openAuth } = useAuth();
  const [requestType, setRequestType] = useState<RequestCategory>("service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [location, setLocation] = useState<Location>({ city: "Harare", suburb: "" });
  const [preferredDate, setPreferredDate] = useState("");
  const [categories, setCategories] = useState<{ name: string; group: Group }[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchCategories().then(setCategories).catch(() => undefined); }, []);
  const categoryOptions = categories.filter((item) => item.group === options.find((o) => o.id === requestType)?.group);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !location.city.trim()) { setError("Add a clear title, details and location so providers can respond."); return; }
    if (!user) { toast("Sign in to post a request"); openAuth(); return; }
    setError(null); setSaving(true);
    const result = await createRequest(user.id, { title, description, category, requestType, budget: budget ? Number(budget) : undefined, currency, city: location.city, suburb: location.suburb, preferredDate: preferredDate || undefined });
    setSaving(false);
    if (result.error) { setError("We couldn't post your request. Please try again."); return; }
    setSubmitted(true); toast("Your request is now visible to relevant providers");
  }

  if (submitted) return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary"><CheckCircle2 className="h-9 w-9" /></span>
      <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-foreground">Request posted</h1>
      <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted">Relevant people and businesses can now discover your need and respond with an offer.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/explore" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary">Explore SUFU</Link><Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-6 py-3 font-semibold text-foreground">Back home</Link></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><HandCoins className="h-5 w-5" /></span><div><h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Post a request</h1><p className="mt-1 text-muted">Tell SUFU what you need. Let the right people come to you.</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option) => <button key={option.id} type="button" aria-pressed={requestType === option.id} onClick={() => setRequestType(option.id)} className={`rounded-2xl border p-4 text-left ${requestType === option.id ? "border-primary bg-primary-soft/60" : "border-border bg-surface"}`}><span className="font-semibold text-foreground">{option.title}</span><span className="mt-1 block text-sm text-muted">{option.body}</span></button>)}</div>
      <form onSubmit={submit} className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div><label className="text-sm font-semibold text-foreground" htmlFor="request-title">What do you need?</label><input id="request-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Need a plumber tomorrow in Avondale" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-semibold text-foreground" htmlFor="request-category">Category</label><select id="request-category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"><option value="">Choose a category…</option>{categoryOptions.map((c) => <option key={c.name}>{c.name}</option>)}</select></div><div><label className="text-sm font-semibold text-foreground" htmlFor="request-budget">Budget</label><div className="mt-1.5 flex gap-2"><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border border-border bg-background px-3 text-foreground"><option>USD</option><option>ZWG</option><option>ZAR</option><option>GBP</option><option>EUR</option></select><input id="request-budget" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></div></div></div>
          <div><label className="text-sm font-semibold text-foreground" htmlFor="request-description">Details</label><textarea id="request-description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quantity, scope, requirements, and anything providers should know." className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="flex items-center gap-2 text-sm font-semibold text-foreground"><MapPin className="h-4 w-4 text-primary" />Location</label><div className="mt-1.5"><LocationPicker value={location} onChange={setLocation} idPrefix="request" compact /></div></div><div><label className="text-sm font-semibold text-foreground" htmlFor="request-date">Preferred date</label><input id="request-date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></div></div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-60">{saving ? "Posting…" : <><Send className="h-4 w-4" />Post request</>}</button>
        </div>
      </form>
    </div>
  );
}
