import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LogIn, Mail, Sparkles, UserPlus, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useToast } from "./Toast";

type Mode = "signin" | "signup" | "magic";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

const primaryButtonClass =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

const titles: Record<Mode, string> = {
  signin: "Welcome back to SUFU",
  signup: "Create your SUFU account",
  magic: "Email me a magic link",
};

export default function AuthModal() {
  const { authOpen, closeAuth, signIn, signUp, sendMagicLink } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset per open, remember the trigger for focus restore, lock body scroll.
  useEffect(() => {
    if (authOpen) {
      restoreRef.current = document.activeElement as HTMLElement | null;
      setMode("signin");
      setError(null);
      setBusy(false);
      setSent(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      restoreRef.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [authOpen]);

  // Focus the first field and trap Tab/Shift+Tab inside the dialog.
  useEffect(() => {
    if (!authOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    firstFieldRef.current?.focus();

    const getFocusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAuth();
        return;
      }
      if (event.key !== "Tab") return;
      const items = getFocusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [authOpen, mode, closeAuth]);

  if (!authOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "magic") {
      const { error: err } = await sendMagicLink(email.trim());
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      setSent(true);
      return;
    }

    if (mode === "signin") {
      const { error: err } = await signIn(email.trim(), password);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      toast("Welcome back — you're signed in");
      closeAuth();
      return;
    }

    const { error: err, needsConfirmation } = await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      setSent(true);
      return;
    }
    toast("Account created — welcome to SUFU");
    closeAuth();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(false);
    setPassword("");
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      {/* Scrim — click to dismiss */}
      <div
        onClick={() => closeAuth()}
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="animate-pop-in relative w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-xl shadow-charcoal/30 sm:rounded-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {mode === "signup" ? (
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              ) : mode === "magic" ? (
                <Mail className="h-5 w-5" aria-hidden="true" />
              ) : (
                <LogIn className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <h2 id="auth-modal-title" className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
              {sent ? "Check your inbox" : titles[mode]}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => closeAuth()}
            aria-label="Close sign-in dialog"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-warm hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6">
            <p className="text-muted">
              We sent a link to <strong className="text-foreground">{email.trim()}</strong>. Open it
              to finish signing in — it only takes a second.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-6 py-3 font-semibold text-foreground transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.97]"
              >
                Back to sign in
              </button>
              <button
                type="button"
                onClick={() => closeAuth()}
                className={primaryButtonClass}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {mode !== "magic" && (
              <div
                role="group"
                aria-label="Choose sign in or create an account"
                className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-warm p-1"
              >
                <button
                  type="button"
                  aria-pressed={mode === "signin"}
                  onClick={() => switchMode("signin")}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                    mode === "signin"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "signup"}
                  onClick={() => switchMode("signup")}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                    mode === "signup"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Create account
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-name" className="text-sm font-semibold text-foreground">
                    Your name
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Tendai Moyo"
                    autoComplete="name"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              {mode !== "signup" && (
                <div>
                  <label htmlFor="auth-email" className="text-sm font-semibold text-foreground">
                    Email
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-email-signup" className="text-sm font-semibold text-foreground">
                    Email
                  </label>
                  <input
                    id="auth-email-signup"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              {mode === "signin" && (
                <div>
                  <label htmlFor="auth-password" className="text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-password-signup" className="text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <input
                    id="auth-password-signup"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                    aria-describedby="auth-password-hint"
                    className={inputClass}
                  />
                  <p id="auth-password-hint" className="mt-1.5 text-xs text-muted">
                    At least 8 characters.
                  </p>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={primaryButtonClass}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    One moment…
                  </>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-border pt-4 text-center text-sm">
              {mode === "signin" && (
                <>
                  <p className="text-muted">
                    New to SUFU?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="cursor-pointer font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
                    >
                      Create an account
                    </button>
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode("magic")}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Use a magic link instead
                  </button>
                </>
              )}
              {mode === "signup" && (
                <p className="text-muted">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="cursor-pointer font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === "magic" && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="cursor-pointer font-semibold text-primary transition-colors duration-150 hover:text-primary-bright"
                >
                  Back to password sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
