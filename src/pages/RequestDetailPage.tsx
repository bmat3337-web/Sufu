import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, MapPin, Send } from "lucide-react";
import { Link } from "../router";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { createOffer, offersForRequest, type RequestOffer, type SufuRequest } from "../lib/requests";

export default function RequestDetailPage({ id }: { id: string }) {
  const { user, openAuth } = useAuth();
  const toast = useToast();
  const [request, setRequest] = useState<SufuRequest | null>(null);
  const [offers, setOffers] = useState<RequestOffer[]>([]);
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [duration, setDuration] = useState("");
  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from("requests").select("id,requester_id,title,description,category,request_type,budget,currency,city,suburb,preferred_date,status,created_at").eq("id", id).single().then(({ data }) => {
      if (data && !cancelled) setRequest({ id: data.id, requesterId: data.requester_id, title: data.title, description: data.description, category: data.category, requestType: data.request_type, budget: data.budget == null ? null : Number(data.budget), currency: data.currency, city: data.city, suburb: data.suburb, preferredDate: data.preferred_date, status: data.status, createdAt: data.created_at });
    });
    offersForRequest(id).then((rows) => !cancelled && setOffers(rows));
    return () => { cancelled = true; };
  }, [id]);

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { toast("Sign in to respond to this request"); openAuth(); return; }
    if (!message.trim() || !availability.trim()) return;
    setSaving(true);
    const result = await createOffer({ requestId: id, providerId: user.id, price: price ? Number(price) : undefined, currency, availability, duration, terms, message });
    setSaving(false);
    if (result.error) { toast("We couldn't send your offer"); return; }
    setMessage(""); setAvailability(""); setPrice(""); setDuration(""); setTerms("");
    setOffers(await offersForRequest(id));
    toast("Offer sent");
  }

  if (!request) return <div className="mx-auto max-w-3xl px-5 py-16 text-center text-muted">Loading request…</div>;
  const isOwner = user?.id === request.requesterId;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <Link to="/requests" className="text-sm font-semibold text-primary hover:underline">← All requests</Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{request.requestType}</span>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground">{request.title}</h1>
          <p className="mt-4 whitespace-pre-wrap leading-7 text-muted">{request.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.suburb ? `${request.suburb}, ` : ""}{request.city}</span>{request.preferredDate && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Needed {request.preferredDate}</span>}{request.budget != null && <span className="font-semibold text-foreground">Budget: {request.currency} {request.budget.toLocaleString()}</span>}</div>
          {isOwner && <div className="mt-7 rounded-xl bg-primary-soft p-4 text-sm text-primary"><CheckCircle2 className="mb-2 h-5 w-5" />You posted this request. Review incoming offers below.</div>}
        </article>

        {!isOwner && request.status === "open" && <form onSubmit={submitOffer} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-heading text-xl font-bold text-foreground">Respond with an offer</h2>
          <p className="mt-1 text-sm text-muted">Give the requester a clear, useful proposal.</p>
          <div className="mt-5 space-y-4">
            <div><label className="text-sm font-semibold">Your message</label><textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explain how you can help…" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" /></div>
            <div><label className="text-sm font-semibold">Availability</label><input required value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Tomorrow after 10am" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" /></div>
            <div className="grid grid-cols-[auto_1fr] gap-2"><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border border-border bg-background px-3"><option>USD</option><option>ZWG</option><option>ZAR</option><option>GBP</option><option>EUR</option></select><input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (optional)" className="w-full rounded-xl border border-border bg-background px-4 py-3" /></div>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (optional)" className="w-full rounded-xl border border-border bg-background px-4 py-3" />
            <textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms (optional)" className="w-full rounded-xl border border-border bg-background px-4 py-3" />
            <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-60"><Send className="h-4 w-4" />{saving ? "Sending…" : "Send offer"}</button>
          </div>
        </form>}
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-2xl font-bold text-foreground">{isOwner ? "Offers received" : "Provider offers"}</h2>
        <div className="mt-3 space-y-3">{offers.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">No offers yet. Be clear and competitive when you respond.</div> : offers.map((offer) => <article key={offer.id} className="rounded-2xl border border-border bg-surface p-5"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-foreground">Offer from provider</span>{offer.price != null && <strong>{offer.currency} {offer.price.toLocaleString()}</strong>}</div><p className="mt-2 text-muted">{offer.message}</p><div className="mt-3 flex flex-wrap gap-3 text-sm text-muted"><span>Available: {offer.availability}</span>{offer.duration && <span>Duration: {offer.duration}</span>}</div>{offer.terms && <p className="mt-2 text-sm text-muted">Terms: {offer.terms}</p>}</article>)}</div>
      </section>
    </div>
  );
}
