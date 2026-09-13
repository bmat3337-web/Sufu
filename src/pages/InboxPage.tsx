import { useEffect, useState } from "react";
import { MessageCircle, MessagesSquare } from "lucide-react";
import { Link } from "../router";
import { useAuth } from "../lib/auth";
import { avatarGradient, initials } from "../components/ProviderCard";
import { DetailSkeleton } from "../components/SkeletonCards";
import { timeAgo } from "../data";
import { myConversations, type ConversationSummary } from "../lib/api";

export default function InboxPage() {
  const { user, loading: authLoading, openAuth } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    myConversations(user.id)
      .then((list) => {
        if (active) setConversations(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div role="status" aria-label="Loading your inbox">
        <DetailSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MessageCircle className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-foreground">
          Your conversations live here
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted">
          Sign in to message providers, ask about listings, and apply for jobs — every thread
          stays safely inside SUFU.
        </p>
        <button
          type="button"
          onClick={openAuth}
          className="mt-8 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
        >
          Sign in / create account
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MessagesSquare className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-foreground">
          No conversations yet
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted">
          Message a provider, ask about a listing, or apply for a job — the first reply starts a
          thread here.
        </p>
        <Link
          to="/explore"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
        >
          Explore SUFU
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">Inbox</p>
      <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground">
        Conversations
      </h1>
      <ul className="mt-6 space-y-3">
        {conversations.map((c) => (
          <li key={c.id}>
            <Link
              to={`/inbox/${c.id}`}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                  c.otherName
                )} font-heading text-sm font-bold text-on-primary`}
              >
                {initials(c.otherName)}
                {c.unreadCount > 0 && (
                  <span
                    aria-label={`${c.unreadCount} unread message${c.unreadCount === 1 ? "" : "s"}`}
                    className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-charcoal ring-2 ring-surface"
                  >
                    {c.unreadCount}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate font-semibold ${
                      c.unreadCount > 0 ? "text-foreground" : "text-foreground/80"
                    }`}
                  >
                    {c.otherName}
                  </span>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-xs text-muted">{timeAgo(c.lastMessageAt)}</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                  {c.listingTitle ? `About: ${c.listingTitle}` : "Direct chat"}
                </span>
                <span
                  className={`mt-0.5 block truncate text-sm ${
                    c.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted"
                  }`}
                >
                  {c.lastMessage
                    ? `${c.lastMessageMine ? "You: " : ""}${c.lastMessage}`
                    : "No messages yet — say hello"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
