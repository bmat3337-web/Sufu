import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Heart,
  Inbox,
  LogOut,
  Mail,
  Plus,
  Tag,
  User,
  Wrench,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { TrustBadges } from "../components/TrustBadge";
import { avatarGradient, initials } from "../components/ProviderCard";
import { Link } from "../router";
import { formatUSD, timeAgo, type Listing, type VerificationId } from "../data";
import {
  mySavedListings,
  receivedApplications,
  myApplications,
  updateApplicationStatus,
  type ApplicationView,
  type ApplicationStatus,
} from "../lib/api";

const roles = [
  { icon: User, title: "Customer", body: "Find and hire trusted locals." },
  { icon: Wrench, title: "Provider", body: "Offer your services to the neighbourhood." },
  { icon: Tag, title: "Seller", body: "List products in the marketplace." },
  { icon: Briefcase, title: "Job seeker", body: "Discover work and opportunities." },
  { icon: Building2, title: "Business owner", body: "Run one profile for your whole business." },
];

const typeLabel: Record<Listing["type"], string> = {
  service: "Service",
  product: "For sale",
  job: "Job",
};

const applicationStatusLabel: Record<string, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  declined: "Declined",
};

export default function ProfilePage() {
  const { user, profile, loading, openAuth, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [applications, setApplications] = useState<ApplicationView[]>([]);
  const [myApps, setMyApps] = useState<ApplicationView[]>([]);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const verifyEmail = async () => {
    setVerifyingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-badge", {
        body: { action: "verify_email" },
      });
      if (error || !data?.ok) {
        // Non-2xx responses surface the parsed body on error.context.data.
        const code =
          (error as { context?: { data?: { error?: string } } } | null)?.context?.data
            ?.error ?? (data as { error?: string } | null)?.error;
        toast(
          code === "email_not_confirmed"
            ? "Confirm your email first — check your inbox for the confirmation link, then try again."
            : "We couldn't verify your email — try again?"
        );
        return;
      }
      await refreshProfile();
      toast("Email verified — your badge is now live");
    } finally {
      setVerifyingEmail(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSavedListings([]);
      setApplications([]);
      setMyApps([]);
      return;
    }
    let active = true;
    setSectionsLoading(true);
    void Promise.all([
      mySavedListings(user.id),
      receivedApplications(user.id),
      myApplications(user.id),
    ])
      .then(([saved, apps, mine]) => {
        if (!active) return;
        setSavedListings(saved);
        setApplications(apps);
        setMyApps(mine);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSectionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const setApplicationStatus = async (
    app: ApplicationView,
    status: Exclude<ApplicationStatus, "pending">
  ) => {
    setBusyApp(app.id);
    const res = await updateApplicationStatus(app.id, status);
    setBusyApp(null);
    if (res.error) {
      toast(res.error);
      return;
    }
    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    toast(
      status === "accepted"
        ? "Application accepted — they'll see it on their profile"
        : status === "declined"
          ? "Application declined"
          : "Applicant shortlisted"
    );
  };

  const memberSinceYear = profile?.member_since
    ? String(new Date(profile.member_since).getFullYear())
    : "";

  const verifiedIds: VerificationId[] = [];
  if (profile?.verified_phone) verifiedIds.push("phone");
  if (profile?.verified_email) verifiedIds.push("email");
  if (profile?.verified_identity) verifiedIds.push("identity");
  if (profile?.verified_business) verifiedIds.push("business");

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Sufu member";
  const locationLine =
    profile?.city && profile?.suburb ? `${profile.city} · ${profile.suburb}` : profile?.city ?? "";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">One account</p>
      <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground">
        Every role. No extra logins.
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        Need a plumber in the morning, sell your phone at lunch, then advertise your photography
        by evening — one SUFU account covers it all.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.title}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <role.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 font-semibold text-foreground">{role.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{role.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
          Meet Tendai — all of the above
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
              "Tendai Moyo"
            )} font-heading text-sm font-bold text-on-primary`}
          >
            {initials("Tendai Moyo")}
          </span>
          <div>
            <p className="font-semibold text-foreground">Tendai Moyo</p>
            <p className="text-sm text-muted">Harare · Avondale · Member since 2023</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Customer", "Provider", "Seller", "Job seeker"].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          aria-label="Loading your account"
          className="mt-8 rounded-2xl bg-charcoal p-6 shadow-xl shadow-charcoal/20 sm:p-8"
        >
          <div className="mx-auto h-6 w-44 animate-pulse rounded-full bg-white/15" />
          <div className="mx-auto mt-3 h-4 w-64 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mt-6 h-12 w-48 animate-pulse rounded-full bg-white/10" />
        </div>
      ) : user ? (
        <>
        <div className="mt-8 rounded-2xl bg-charcoal p-6 shadow-xl shadow-charcoal/20 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                displayName
              )} font-heading text-lg font-bold text-on-primary`}
            >
              {initials(displayName)}
            </span>
            <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-white">
              You're signed in
            </h2>
            <p className="mt-1 font-semibold text-white/90">{displayName}</p>
            <p className="mt-0.5 text-sm text-white/60">
              {user.email}
              {memberSinceYear ? ` · Member since ${memberSinceYear}` : ""}
              {locationLine ? ` · ${locationLine}` : ""}
            </p>
            {verifiedIds.length > 0 && (
              <div className="mt-3">
                <TrustBadges ids={verifiedIds} />
              </div>
            )}
            {!profile?.verified_email && (
              <button
                type="button"
                onClick={() => void verifyEmail()}
                disabled={verifyingEmail}
                className="mt-4 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 ease-out hover:border-gold/60 hover:bg-gold/10 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {verifyingEmail ? "Checking…" : "Verify email"}
              </button>
            )}
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              One account covers every role — post a service, sell something, hire, or run your
              business from this single profile.
            </p>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/post"
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-8 py-3.5 font-bold text-charcoal shadow-lg shadow-gold/25 transition-all duration-150 ease-out hover:bg-gold-soft active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Post something
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => toast("Signed out — see you soon"));
              }}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all duration-150 hover:border-white/40 hover:bg-white/10 active:scale-[0.97]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>

        {sectionsLoading ? (
          <div
            aria-label="Loading your saved listings and applications"
            className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="h-5 w-40 animate-pulse rounded-full bg-surface-warm" />
            <div className="mt-4 space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-surface-warm/70" />
              <div className="h-16 animate-pulse rounded-xl bg-surface-warm/70" />
            </div>
          </div>
        ) : (
          <>
            {/* Saved listings — owner-only */}
            <section
              aria-label="Saved listings"
              className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
                <Heart className="h-4 w-4 text-primary" fill="currentColor" aria-hidden="true" />
                Saved listings
              </h2>
              {savedListings.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Nothing saved yet — tap the heart on any listing and it'll wait for you here.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {savedListings.map((listing) => {
                    const price =
                      listing.type === "job"
                        ? (listing.salaryLabel ?? "See details")
                        : formatUSD(listing.price ?? 0);
                    return (
                      <li key={listing.id}>
                        <Link
                          to={`/listing/${listing.id}`}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface-warm/60 px-4 py-3 transition-all duration-150 hover:bg-surface-warm hover:shadow-sm active:scale-[0.99]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">
                              {listing.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {typeLabel[listing.type]} · {listing.location.suburb},{" "}
                              {listing.location.city} · Saved {timeAgo(listing.postedAt)}
                            </span>
                          </span>
                          <span className="shrink-0 font-heading text-sm font-bold text-primary">
                            {price}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* My applications — jobs I've applied to */}
            <section
              aria-label="My applications"
              className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
                <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                My applications
              </h2>
              {myApps.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  You haven't applied to any jobs yet — open a job listing and hit "Apply for this
                  job". Your applications and their status will show up here.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {myApps.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-xl bg-surface-warm/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to={`/listing/${app.listingId}`}
                          className="min-w-0 font-semibold text-primary hover:text-primary-bright"
                        >
                          {app.listingTitle}
                        </Link>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            app.status === "accepted"
                              ? "bg-primary-soft text-primary"
                              : app.status === "declined"
                                ? "bg-surface-warm text-muted"
                                : app.status === "shortlisted"
                                  ? "bg-gold-soft text-gold-deep"
                                  : "bg-surface-warm text-muted"
                          }`}
                        >
                          {applicationStatusLabel[app.status] ?? app.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        Applied {timeAgo(app.createdAt)}
                        {app.coverNote ? " · With a note" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Applications received — listing owner only */}
            <section
              aria-label="Applications received"
              className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
                <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
                Applications received
              </h2>
              {applications.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  No applications yet — when someone applies to one of your job listings, their
                  application shows up here.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {applications.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-xl bg-surface-warm/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0">
                          <span className="font-semibold text-foreground">{app.applicantName}</span>
                          <span className="text-sm text-muted">
                            {" "}
                            applied to{" "}
                            <Link
                              to={`/listing/${app.listingId}`}
                              className="font-medium text-primary hover:text-primary-bright"
                            >
                              {app.listingTitle}
                            </Link>
                          </span>
                        </p>
                        <span className="rounded-full bg-surface-warm px-2.5 py-0.5 text-xs font-semibold text-muted">
                          {applicationStatusLabel[app.status] ?? app.status}
                        </span>
                      </div>
                      {app.coverNote && (
                        <p className="mt-2 text-sm leading-relaxed text-muted">{app.coverNote}</p>
                      )}
                      <p className="mt-1.5 text-xs text-muted">{timeAgo(app.createdAt)}</p>
                      {(app.status === "pending" || app.status === "shortlisted") && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {app.status !== "shortlisted" && (
                            <button
                              type="button"
                              onClick={() => void setApplicationStatus(app, "shortlisted")}
                              disabled={busyApp === app.id}
                              className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-gold-deep/40 px-3 py-1.5 text-xs font-semibold text-gold-deep transition-all duration-150 ease-out hover:bg-gold-soft active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void setApplicationStatus(app, "accepted")}
                            disabled={busyApp === app.id}
                            className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void setApplicationStatus(app, "declined")}
                            disabled={busyApp === app.id}
                            className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-all duration-150 ease-out hover:bg-surface-warm active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        </>
      ) : (
        <div className="mt-8 rounded-2xl bg-charcoal p-6 text-center shadow-xl shadow-charcoal/20 sm:p-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-white">
            Your profile starts with an account
          </h2>
          <p className="mx-auto mt-2 max-w-md text-white/70">
            Sign in to post listings, save favourites and message neighbours — one account covers
            every role.
          </p>
          <button
            type="button"
            onClick={openAuth}
            className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-gold px-8 py-3.5 font-bold text-charcoal shadow-lg shadow-gold/25 transition-all duration-150 ease-out hover:bg-gold-soft active:scale-[0.97]"
          >
            Sign in / create account
          </button>
          <p className="mt-3 text-xs text-white/50">Free forever. No card needed.</p>
        </div>
      )}
    </div>
  );
}
