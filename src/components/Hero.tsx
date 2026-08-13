import { Link } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
import heroImage from "@/assets/hero-man.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-x grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-16 lg:py-28">
        <div className="relative z-10">
          <p className="label-caps">{publicContent.homepage.hero.eyebrow}</p>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] text-foreground">
            {publicContent.homepage.hero.title}
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {publicContent.homepage.hero.body}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              to="/start"
              className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-7 py-3.5 text-sm font-medium hover:bg-gold-soft transition-colors"
            >
              {publicContent.homepage.hero.primaryAction}
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              {publicContent.homepage.hero.secondaryAction}
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 bg-gradient-to-tr from-gold/10 via-transparent to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border/60">
            <img
              src={heroImage}
              alt={publicContent.homepage.hero.imageAlt}
              width={1080}
              height={1440}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
