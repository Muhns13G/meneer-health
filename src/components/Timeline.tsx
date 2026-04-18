const events = [
  { title: "Complete intake" },
  { title: "Consult with your doctor" },
  { title: "Prescription sent to pharmacy" },
  { title: "Treatment at your door" },
];

export function Timeline({ events: items = events }: { events?: typeof events }) {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x max-w-3xl">
        <p className="label-caps mb-4">The timeline</p>
        <h2 className="font-serif text-3xl sm:text-4xl mb-12">From tap to treatment.</h2>

        <ol className="relative border-l border-border/70 pl-8 space-y-10">
          {items.map((e, i) => (
            <li key={e.title} className="relative">
              <span className="absolute -left-[37px] top-1 flex items-center justify-center w-4 h-4 rounded-full bg-gold ring-4 ring-background" />
              <h3 className="font-serif text-xl text-foreground">
                <span className="text-gold/80 mr-3">0{i + 1}</span>
                {e.title}
              </h3>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
