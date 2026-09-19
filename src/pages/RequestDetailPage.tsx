import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, MapPin, Send, MessageCircle, XCircle } from "lucide-react";
import { Link, navigate } from "../router";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { createOffer, offersForRequest, getRequest, acceptRequestOffer, updateOfferStatus, type RequestOffer, type SufuRequest } from "../lib/requests";
import { getOrCreateConversation, providersByIds } from "../lib/api";
import { matchRequestListings, matchLabel, type RequestMatch } from "../lib/matching";
import { SufuJourney } from "../components/SufuJourney";
import { FileCheck2, HandCoins } from "lucide-react";

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
  const [acting, setActing] = useState<string | null>(null);
  const [matches, setMatches] = useState<RequestMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  async function reload() {
    const [nextRequest, nextOffers] = await Promise.all([getRequest(id), offersForRequest(id)]);
    setRequest(nextRequest); setOffers(nextOffers);
    setMatchLoading(true);
    const nextMatches = await matchRequestListings(id);
    setMatches(nextMatches.slice(0, 6));
    setMatchLoading(false);
  }
  useEffect(() => { void reload(); }, [id]);

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { toast("Sign in to respond to this request"); openAuth(); return; }
    if (!message.trim() || !availability.trim()) return;
    setSaving(true);
    const result = await createOffer({ requestId: id, providerId: user.id, price: price ? Number(price) : undefined, currency, availability, duration, terms, message });
    setSaving(false);
    if (result.error) { toast("We couldn't send your offer"); return; }
    setMessage(""); setAvailability(""); setPrice(""); setDuration(""); setTerms("");
    await reload(); toast("Offer sent");
  }

  async function accept(offer: RequestOffer) {
    if (!user || !request || user.id !== request.requesterId) return;
    setActing(offer.id);
    const result = await acceptRequestOffer(offer.id);
    if (result.error) { toast("We couldn't accept that offer — it may already have been resolved."); setActing(null); return; }
    await reload();
    const conversationId = await getOrCreateConversation(null, offer.providerId);
    setActing(null);
    if (conversationId) navigate(`/inbox/${conversationId}`); else toast("Offer accepted. You can now contact the provider.");
  }

  async function decline(offer: RequestOffer) {
    if (!user || !request || user.id !== request.requesterId) return;
    setActing(offer.id);
    const result = await updateOfferStatus(offer.id, "declined");
    setActing(null);
    if (result.error) { toast("We couldn't decline that offer"); return; }
    await reload(); toast("Offer declined");
  }

  if (!request) return <div className="mx-auto max-w-3xl px-5 py-16 text-center text-muted">Loading request…</div>;
  const isOwner = user?.id === request.requesterId;
  const hasAccepted = offers.some((o) => o.status === "accepted");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <SufuJourney stage={hasAccepted ? "connected" : "need"} />
      <Link to="/requests" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">← All requests</Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{request.requestType}</span><span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted">{request.status}</span></div>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground">{request.title}</h1>
          <p className="mt-4 whitespace-pre-wrap leading-7 text-muted">{request.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.suburb ? `${request.suburb}, ` : ""}{request.city}</span>{request.preferredDate && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Needed {request.preferredDate}</span>}{request.budget != null && <span className="font-semibold text-foreground">Budget: {request.currency} {request.budget.toLocaleString()}</span>}</div>
          {isOwner && <div className="mt-7 rounded-xl bg-primary-soft p-4 text-sm text-primary"><CheckCircle2 className="mb-2 h-5 w-5" />You posted this request. Compare offers and choose the provider that fits.</div>}
          {hasAccepted && <div className="mt-4 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm font-semibold text-primary">Provider selected. Your conversation is ready.</div>}
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

      <section className="mt-8 rounded-[24px] border border-border/70 bg-[#fffdf7] p-5"><div className="flex flex-wrap items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary"><HandCoins className="h-5 w-5"/></span><div><p className="text-sm font-semibold text-foreground">A SUFU offer is more than a message</p><p className="text-sm text-muted">Clear price, availability, duration and terms turn demand into an actionable agreement.</p></div></div></section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><h2 className="font-heading text-2xl font-bold text-foreground">{isOwner ? "Offers received" : "Provider offers"}</h2><p className="mt-1 text-sm text-muted">{offers.length} {offers.length === 1 ? "proposal" : "proposals"}</p></div></div>
        <div className="mt-3 space-y-3">
          {offers.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">No offers yet.</div> : offers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-foreground">Provider offer</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${offer.status === "accepted" ? "bg-primary-soft text-primary" : offer.status === "declined" ? "bg-background text-muted" : "bg-surface-warm text-foreground"}`}>{offer.status}</span></div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">{offer.price != null && <strong className="text-foreground">{offer.currency} {offer.price.toLocaleString()}</strong>}<span className="text-muted">Available: {offer.availability}</span>{offer.duration && <span className="text-muted">Duration: {offer.duration}</span>}</div>
              <p className="mt-3 text-muted">{offer.message}</p>{offer.terms && <p className="mt-2 text-sm text-muted">Terms: {offer.terms}</p>}
              {isOwner && offer.status === "pending" && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void accept(offer)} disabled={acting === offer.id || hasAccepted} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-on-primary disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{acting === offer.id ? "Working…" : "Accept offer"}</button><button type="button" onClick={() => void decline(offer)} disabled={acting === offer.id || hasAccepted} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 font-semibold text-foreground disabled:opacity-50"><XCircle className="h-4 w-4" />Decline</button></div>}
              {offer.status === "accepted" && <button type="button" onClick={async () => { if (!user) { openAuth(); return; } const cid = await getOrCreateConversation(null, offer.providerId); if (cid) navigate(`/inbox/${cid}`); }} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 font-semibold text-primary"><MessageCircle className="h-4 w-4" />Open conversation</button>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
