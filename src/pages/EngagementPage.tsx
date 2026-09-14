import { useEffect, useState } from "react";
import { CheckCircle2, CircleDot, MessageCircle, ShieldAlert, Star, XCircle } from "lucide-react";
import { navigate } from "../router";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { getEngagement, updateEngagementStatus, type Engagement } from "../lib/engagements";
import { getOrCreateConversation } from "../lib/api";
import { submitReview } from "../lib/reviews";

const labels: Record<Engagement["status"], string> = {
  agreed: "Agreed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled", disputed: "Disputed",
};

export default function EngagementPage({ id }: { id: string }) {
  const { user, openAuth } = useAuth();
  const toast = useToast();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [acting, setActing] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewed, setReviewed] = useState(false);

  async function reload() { setEngagement(await getEngagement(id)); }
  useEffect(() => { void reload(); }, [id]);

  async function change(status: "in_progress" | "completed" | "cancelled" | "disputed") {
    if (!user) { openAuth(); return; }
    setActing(true);
    const result = await updateEngagementStatus(id, status);
    setActing(false);
    if (result.error) { toast(result.error); return; }
    await reload();
    toast(status === "completed" ? "Work marked completed" : `Engagement ${status.replace("_", " ")}`);
  }

  async function review() {
    if (!user) { openAuth(); return; }
    if (!rating) { toast("Choose a rating first"); return; }
    setActing(true);
    const result = await submitReview(id, rating, reviewBody);
    setActing(false);
    if (result.error) { toast(result.error.includes("ALREADY") ? "You already reviewed this engagement" : "We couldn't submit the review"); return; }
    setReviewed(true);
    toast("Review submitted");
  }

  if (!engagement) return <div className="mx-auto max-w-3xl px-5 py-16 text-center text-muted">Loading engagement…</div>;
  const isRequester = user?.id === engagement.requesterId;
  const isProvider = user?.id === engagement.providerId;
  const canAct = isRequester || isProvider;

  return <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary"><CircleDot className="h-4 w-4" />{labels[engagement.status]}</span>
        <span className="text-sm font-semibold text-muted">{engagement.agreedCurrency} {engagement.agreedAmount.toLocaleString()}</span>
      </div>
      <h1 className="mt-5 font-heading text-3xl font-bold text-foreground">{engagement.agreedTitle}</h1>
      <p className="mt-4 whitespace-pre-wrap leading-7 text-muted">{engagement.agreedScope}</p>
      {engagement.agreedTerms && <div className="mt-5 rounded-xl bg-background p-4"><div className="text-sm font-semibold text-foreground">Agreed terms</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{engagement.agreedTerms}</p></div>}

      <div className="mt-7 border-t border-border pt-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-background px-3 py-2">Requester</span>
          <span className="rounded-lg bg-background px-3 py-2">Provider</span>
          <span className="rounded-lg bg-background px-3 py-2">Payment not collected yet</span>
        </div>
        <div className="mt-5 grid gap-2">
          {engagement.status === "agreed" && canAct && <button disabled={acting} onClick={() => void change("in_progress")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"><CircleDot className="h-4 w-4" />Start work</button>}
          {engagement.status === "in_progress" && isRequester && <button disabled={acting} onClick={() => void change("completed")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Mark completed</button>}
          {(engagement.status === "agreed" || engagement.status === "in_progress") && canAct && <div className="grid gap-2 sm:grid-cols-2"><button disabled={acting} onClick={() => void change("cancelled")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-semibold"><XCircle className="h-4 w-4" />Cancel</button><button disabled={acting} onClick={() => void change("disputed")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700"><ShieldAlert className="h-4 w-4" />Raise dispute</button></div>}
          {canAct && <button onClick={async () => { const other = isRequester ? engagement.providerId : engagement.requesterId; const cid = await getOrCreateConversation(null, other); if (cid) navigate(`/inbox/${cid}`); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-3 font-semibold text-primary"><MessageCircle className="h-4 w-4" />Open conversation</button>}
        </div>
      </div>
    </div>

    {engagement.status === "completed" && canAct && <section className="mt-5 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3"><Star className="mt-0.5 h-5 w-5 text-gold" fill="currentColor" /><div><h2 className="font-heading text-xl font-bold text-foreground">Rate this engagement</h2><p className="mt-1 text-sm text-muted">Your review is tied to this completed engagement.</p></div></div>
      {reviewed ? <div className="mt-5 rounded-xl bg-primary-soft p-4 text-sm font-semibold text-primary">Thanks — your review has been recorded.</div> : <div className="mt-5">
        <div className="flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5">
          {[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className="rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-primary"><Star className={`h-7 w-7 ${value <= rating ? "text-gold" : "text-border"}`} fill={value <= rating ? "currentColor" : "none"} /></button>)}
        </div>
        <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} maxLength={2000} rows={4} placeholder="Share what went well…" className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />
        <button disabled={acting || !rating} onClick={() => void review()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-50">{acting ? "Submitting…" : "Submit review"}</button>
      </div>}
    </section>}
  </div>;
}
