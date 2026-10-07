import { publicContent } from "@content/public-content";

export function Doctor() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <p className="label-caps mb-4">{publicContent.homepage.doctor.eyebrow}</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
            {publicContent.homepage.doctor.title}
          </h2>
        </div>
        <div className="space-y-8">
          <blockquote className="border-l-2 border-gold pl-6 font-serif italic text-xl sm:text-2xl text-foreground leading-snug">
            &ldquo;{publicContent.homepage.doctor.quote}&rdquo;
          </blockquote>
          <p className="text-muted-foreground leading-relaxed">
            {publicContent.homepage.doctor.assurance}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {publicContent.homepage.doctor.unsuitable}
          </p>
        </div>
      </div>
    </section>
  );
}
