const steps = [
  {
    n: "01",
    title: "Tell us what's up",
    body: "A few private questions, one at a time. No clipboards, no small talk, no waiting room magazines from 2014.",
  },
  {
    n: "02",
    title: "Meet a real, registered doctor",
    body: "HPCSA-registered SA doctors. Evenings, weekends, in your kitchen. Pick a slot like you'd pick a flat white.",
  },
  {
    n: "03",
    title: "We courier the goods",
    body: "Licensed local pharmacy. Boxed in nondescript beige. Even your nosy neighbour won't crack the case.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 border-t border-border/50">
      <div className="container-x">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight mb-16">
          Three steps. Zero awkwardness.
        </h2>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-14">
          {steps.map((s) => (
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
