import { Link } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";

export function CtaSection() {
  return (
    <section className="py-24 border-t border-border/50">
      <div className="container-x max-w-3xl text-center">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
          {publicContent.homepage.cta.title}
        </h2>
        <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
          {publicContent.homepage.cta.body}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/start"
            className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-7 py-3.5 text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            {publicContent.homepage.cta.primaryAction}
          </Link>
          <a
            href="#how"
            className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            {publicContent.homepage.cta.secondaryAction}
          </a>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">{publicContent.homepage.cta.assurance}</p>
      </div>
    </section>
  );
}
