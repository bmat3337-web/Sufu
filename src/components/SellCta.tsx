import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "../router";

export default function SellCta() {
  return (
    <section id="sell" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-6xl px-5 pb-20 lg:px-8 lg:pb-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-charcoal px-6 py-14 text-center shadow-2xl shadow-charcoal/30 sm:px-12 lg:py-20">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
            <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
            <div className="dot-grid-light absolute inset-0" />
          </div>

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-soft">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Got something to offer?
            </p>

            <h2 className="mx-auto mt-6 max-w-2xl font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Got something to sell?{" "}
              <span className="bg-gradient-to-r from-gold-soft via-gold to-gold-soft bg-clip-text text-transparent">
                Sufu it.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Offer a service, sell a product, post a job, or open a business profile — in
              minutes, with one account.
            </p>

            <Link
              to="/post"
              className="mt-9 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-charcoal shadow-lg shadow-gold/30 transition-all duration-150 ease-out hover:bg-gold-soft active:scale-[0.97]"
            >
              Sufu it — start posting
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>

            <p className="mt-4 text-sm text-white/50">
              Free to post · Offer a service, sell, or hire
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
