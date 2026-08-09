import { Link } from "@tanstack/react-router";

export function CtaSection() {
  return (
    <section className="py-24 border-t border-border/50">
      <div className="container-x max-w-3xl text-center">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
          Most men wait too long. You really don't have to.
        </h2>
        <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
          Five minutes of honesty. A real doctor on the other side. Treatment in the post by the
          weekend. That's it.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/start"
            className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-7 py-3.5 text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            See if you qualify
          </Link>
          <a
            href="#how"
            className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Read how it works
          </a>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          No commitment. No phone calls. No one's the wiser.
        </p>
      </div>
    </section>
  );
}
