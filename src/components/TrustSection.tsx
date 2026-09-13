import { BadgeCheck, HandCoins, Languages } from "lucide-react";

const trustPoints = [
  {
    icon: BadgeCheck,
    title: "Earned trust badges",
    body: "Profiles go live fast, and identity, email and business badges appear only after each check is completed.",
  },
  {
    icon: HandCoins,
    title: "Fair prices, agreed in person",
    body: "Meet your match, agree the price face to face. No surprises.",
  },
  {
    icon: Languages,
    title: "In your language",
    body: "SUFU works in English, Shona and Ndebele — so nothing gets lost.",
  },
];

export default function TrustSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Photo */}
          <div className="relative order-2 lg:order-1">
            <div
              className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary-soft via-transparent to-gold-soft"
              aria-hidden="true"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80"
              alt="Portrait of a smiling community member in Harare"
              width={900}
              height={1125}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-3xl border border-border object-cover shadow-xl shadow-foreground/10"
            />
            <span className="absolute right-4 top-4 rounded-full bg-charcoal/85 px-4 py-2 text-sm font-semibold text-gold-soft backdrop-blur">
              Local first. Always.
            </span>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">
              Why SUFU
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built by locals. Trusted by locals.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              SUFU matches need to neighbour —{" "}
              <strong className="font-semibold text-foreground">
                Need → Match → Connect
              </strong>
              . The person who fixes your sink or sells your maize meal isn't a
              stranger; they're part of your community, and trust grows through
              visible badges, reviews and secure server-checked data.
            </p>

            <ul className="mt-8 space-y-5">
              {trustPoints.map((point) => (
                <li key={point.title} className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <point.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-1 text-muted">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
