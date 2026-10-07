import { publicContent } from "@content/public-content";

export function HowItWorks() {
  return (
    <section id="how" className="py-20 border-t border-border/50">
      <div className="container-x">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight mb-16">
          {publicContent.homepage.howItWorks.title}
        </h2>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-14">
          {publicContent.homepage.howItWorks.steps.map((s) => (
            <div key={s.n}>
              <div className="font-serif text-5xl text-gold/80">{s.n}</div>
              <h3 className="mt-4 font-serif text-2xl text-foreground">{s.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
