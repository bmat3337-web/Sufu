import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Link, navigate } from "../router";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { avatarGradient, initials } from "../components/ProviderCard";
import { SufuJourney } from "../components/SufuJourney";
import { DetailSkeleton } from "../components/SkeletonCards";
import {
  conversationDetail,
  markConversationRead,
  messagesForConversation,
  sendMessage,
  type ConversationDetail as Conversation,
  type ThreadMessage,
} from "../lib/api";

const messageTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function ThreadPage({ id }: { id: string }) {
  const toast = useToast();
  const { user, loading: authLoading, openAuth } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null | undefined>();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadThread = async (meId: string) => {
    const [conv, msgs] = await Promise.all([
      conversationDetail(id, meId),
      messagesForConversation(id, meId),
    ]);
    setConversation(conv);
    setMessages(msgs);
    if (conv) void markConversationRead(id, meId);
  };

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setConversation(null);
      setMessages([]);
      return;
    }
    const meId = user.id;
    loadThread(meId).catch(() => {
      if (active) setConversation(undefined);
    });
    // Poll for replies while the thread is open — lightweight for a marketplace chat.
    const poll = window.setInterval(() => {
      void loadThread(meId).catch(() => undefined);
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, authLoading]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversation?.id]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !user || !conversation) return;
    setSending(true);
    const res = await sendMessage(conversation.id, user.id, body);
    setSending(false);
    if (res.error) {
      toast("We couldn't send that message — try again?");
      return;
    }
    setDraft("");
    await loadThread(user.id);
  };

  if (authLoading) {
    return (
      <div role="status" aria-label="Loading conversation">
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
          Sign in to read your messages
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted">
          Conversations stay private to the people in them — sign in to see this thread.
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

  if (conversation === undefined) {
    return (
      <div role="status" aria-label="Loading conversation">
        <DetailSkeleton />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Conversation not found
        </h1>
        <p className="mt-3 text-muted">
          This thread is private — if it isn't yours, it stays hidden.
        </p>
        <Link
          to="/inbox"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
        >
          Back to Inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col px-5 py-6 lg:px-8">
      <SufuJourney stage="connected" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/inbox")}
          aria-label="Back to inbox"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Inbox
        </button>
      </div>

      {/* Thread header */}
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
            conversation.otherName
          )} font-heading text-sm font-bold text-on-primary`}
        >
          {initials(conversation.otherName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{conversation.otherName}</p>
          {conversation.listingTitle ? (
            <Link
              to={`/listing/${conversation.listingId}`}
              className="block truncate text-sm text-primary hover:text-primary-bright"
            >
              About: {conversation.listingTitle}
            </Link>
          ) : (
            <p className="text-sm text-muted">
              {conversation.otherIsBusiness ? "Business profile" : "SUFU profile"}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${conversation.otherName}`}
        className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-sm"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Say hello — this conversation is brand new.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  m.mine
                    ? "rounded-br-md bg-primary text-on-primary"
                    : "rounded-bl-md bg-surface-warm text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                <p
                  className={`mt-1 text-right text-[10px] font-medium ${
                    m.mine ? "text-on-primary/70" : "text-muted"
                  }`}
                >
                  {messageTime(m.createdAt)}
                  {m.mine && m.readAt ? " · Read" : ""}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send box */}
      <form
        onSubmit={onSend}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm"
      >
        <label htmlFor="message-draft" className="sr-only">
          Message {conversation.otherName}
        </label>
        <textarea
          id="message-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend(e);
            }
          }}
          rows={1}
          placeholder={`Message ${conversation.otherName.split(" ")[0]}…`}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/70"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="inline-flex min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
