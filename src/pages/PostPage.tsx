import { useEffect, useState, type FormEvent } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Loader2,
  Send,
  Tag,
  Wrench,
} from "lucide-react";
import { Link } from "../router";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { createListing, setListingCoverImage, updateOwnProfile, fetchCategories } from "../lib/api";
import LocationPicker from "../components/LocationPicker";
import { formatUSD, type Group, type Location } from "../data";
import { uploadListingCoverImage } from "../lib/media";
import { SufuJourney } from "../components/SufuJourney";

type DraftType = "service" | "product" | "job" | "business";

const draftOptions: {
  id: DraftType;
  title: string;
  body: string;
  icon: typeof Wrench;
  group: Group;
}[] = [
  { id: "service", title: "Offer a service", body: "Plumbing, design, cleaning…", icon: Wrench, group: "services" },
  { id: "product", title: "Sell something", body: "Phones, furniture, vehicles…", icon: Tag, group: "marketplace" },
  { id: "job", title: "Post a job", body: "Hire full-time or casual", icon: Briefcase, group: "jobs" },
  { id: "business", title: "Business profile", body: "One home for your business", icon: Building2, group: "businesses" },
];

const conditions = ["Used · Like new", "Used · Good", "Used · Fair", "New"];
const employmentTypes = ["Full-time", "Part-time", "Casual", "Freelance", "Contract", "Gig"];

const groupLabels: Record<DraftType, string> = {
  service: "service",
  product: "product",
  job: "job",
  business: "business",
};

export default function PostPage() {
  const toast = useToast();
  const { user, profile, openAuth } = useAuth();
  const [draftType, setDraftType] = useState<DraftType>("service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState(conditions[0]);
  const [employmentType, setEmploymentType] = useState(employmentTypes[0]);
  const [remote, setRemote] = useState(false);
  const [location, setLocation] = useState<Location>({ city: "Harare", suburb: "Avondale" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState<{ name: string; group: Group }[]>([]);

  // Categories come from the live Supabase table — no static mock list.
  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((cats) => {
        if (active) setCategoryList(cats);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const active = draftOptions.find((o) => o.id === draftType)!;
  const categoryOptions = categoryList.filter((c) => c.group === active.group);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give your listing a clear title — e.g. \u201CPlumbing repairs in Avondale\u201D.");
      return;
    }
    setError(null);

    if (!user) {
      toast("Sign in to publish — one account covers every role");
      openAuth();
      return;
    }

    setSaving(true);
    let result: { id?: string; error?: string };

    if (draftType === "business") {
      result = await updateOwnProfile(user.id, {
        display_name: title.trim(),
        category: category || undefined,
        bio: description,
        city: location.city,
        suburb: location.suburb,
        is_business: true,
      });
    } else {
      result = await createListing(user.id, {
        type: draftType,
        title: title.trim(),
        description,
        category: category || undefined,
        price: draftType === "job" ? undefined : price ? Number(price) : undefined,
        salaryLabel: draftType === "job" ? price : undefined,
        condition: draftType === "product" ? condition : undefined,
        employmentType: draftType === "job" ? employmentType : undefined,
        remote: draftType === "job" ? remote : undefined,
        city: location.city,
        suburb: location.suburb,
      });
    }
    setSaving(false);

    if (result.error) {
      setError("We couldn't publish that — please try again.");
      return;
    }

    if (draftType !== "business" && result.id && coverImage) {
      const uploaded = await uploadListingCoverImage(coverImage, user.id);
      if (uploaded.url) {
        await setListingCoverImage(result.id, uploaded.url);
      } else if (uploaded.error) {
        toast("Listing published, but the cover image could not be saved.");
      }
    }
    setPublishedId(result.id ?? null);
    setSubmitted(true);
    toast(draftType === "business" ? "Your business profile is live" : "Your listing is live");
  }

  function reset() {
    setSubmitted(false);
    setPublishedId(null);
    setTitle("");
    setDescription("");
    setCoverImage(null);
    setPrice("");
    setCategory("");
    setLocation({ city: "Harare", suburb: "Avondale" });
    setError(null);
  }

  if (submitted) {
    const isBusiness = draftType === "business";
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:px-8">
        <span className="animate-pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-foreground">
          {isBusiness ? "Your business profile is live" : "Your listing is live"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted">
          {isBusiness
            ? "Neighbours can now find you in the SUFU directory — right where you posted from."
            : "It's now visible on Explore for neighbours nearby. You can manage it from your profile."}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!isBusiness && publishedId && (
            <Link
              to={`/listing/${publishedId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97]"
            >
              View your listing
            </Link>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-6 py-3 font-semibold text-foreground transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.97]"
          >
            Post another
          </button>
          <Link
            to="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-6 py-3 font-semibold text-foreground transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.97]"
          >
            Browse listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <p className="mt-4 text-sm font-semibold text-primary">Turn a need into an opportunity.</p><h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground">Post on SUFU</h1>
      <p className="mt-2 text-muted">
        Offer a service, sell something, post a job, or create a business profile. One account
        does it all — no separate logins.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {draftOptions.map((option) => {
          const selected = draftType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setDraftType(option.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.98] ${
                selected
                  ? "border-primary bg-primary-soft/60 shadow-sm"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  selected ? "bg-primary text-on-primary" : "bg-surface-warm text-primary"
                }`}
              >
                <option.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-foreground">{option.title}</span>
                <span className="block text-sm text-muted">{option.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={publish} className="mt-8" noValidate>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {active.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Keep it simple — good titles and clear details get better matches.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="post-title" className="text-sm font-semibold text-foreground">
                Title
              </label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  draftType === "service"
                    ? "e.g. Plumbing repairs in Avondale"
                    : draftType === "product"
                      ? "e.g. Samsung Galaxy S23 128GB"
                      : draftType === "job"
                        ? "e.g. Mechanic wanted — Avondale"
                        : "e.g. Kudzai Cleaning Co"
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "post-title-error" : undefined}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              {error && (
                <p id="post-title-error" role="alert" className="mt-1.5 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="post-category" className="text-sm font-semibold text-foreground">
                  Category
                </label>
                <select
                  id="post-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-1.5 w-full cursor-pointer rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  <option value="">Choose a category…</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {(draftType === "product" || draftType === "service") && (
                <div>
                  <label htmlFor="post-price" className="text-sm font-semibold text-foreground">
                    {draftType === "product" ? "Price (USD)" : "Starting price (USD)"}
                  </label>
                  <input
                    id="post-price"
                    type="number"
                    min={0}
                    step={1}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="e.g. 45"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              )}
            </div>

            {draftType === "product" && (
              <div>
                <span className="text-sm font-semibold text-foreground">Condition</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={condition === c}
                      onClick={() => setCondition(c)}
                      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                        condition === c
                          ? "border-primary bg-primary text-on-primary"
                          : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draftType === "job" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="post-salary" className="text-sm font-semibold text-foreground">
                    Salary or budget
                  </label>
                  <input
                    id="post-salary"
                    type="text"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="e.g. $250/mo or $100–$300/project"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label htmlFor="post-type" className="text-sm font-semibold text-foreground">
                    Employment type
                  </label>
                  <select
                    id="post-type"
                    value={employmentType}
                    onChange={(event) => setEmploymentType(event.target.value)}
                    className="mt-1.5 w-full cursor-pointer rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    {employmentTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={remote}
                    onChange={(event) => setRemote(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  This job can be done remotely
                </label>
              </div>
            )}

            {draftType !== "business" && (
              <div>
                <label htmlFor="post-cover-image" className="text-sm font-semibold text-foreground">
                  Cover image <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="post-cover-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setCoverImage(event.target.files?.[0] ?? null)}
                  className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary"
                />
                <p className="mt-1.5 text-xs text-muted">JPG, PNG or WebP · up to 5 MB. Use a clear photo of the product, work or service.</p>
                {coverImage && <p className="mt-1.5 text-sm font-medium text-primary">{coverImage.name}</p>}
              </div>
            )}

            <div>
              <label htmlFor="post-description" className="text-sm font-semibold text-foreground">
                Description
              </label>
              <textarea
                id="post-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="What are you offering? What makes it worth matching?"
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-warm px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Where?</span>
              <LocationPicker value={location} onChange={setLocation} idPrefix="post" compact />
            </div>

            {draftType !== "business" && price && (
              <p className="text-sm text-muted">
                {groupLabels[draftType]} price preview:{" "}
                <strong className="text-primary">
                  {draftType === "job" ? price : formatUSD(Number(price) || 0)}
                </strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 ease-out hover:bg-primary-bright active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Publish {groupLabels[draftType]}
              </>
            )}
          </button>
          <p className="mt-3 text-sm text-muted">
            {user
              ? `Free to post — publishing as ${profile?.display_name?.trim() || "you"}.`
              : "Free to post. Sign in when you publish — one account covers every role."}
          </p>
        </div>
      </form>
    </div>
  );
}
