const items = [
  "Zero waiting rooms",
  "Doctor-prescribed, evidence-led",
  "Boxed in beige, dropped at your door",
  "Cancel whenever — no awkward call",
];

export function Benefits() {
  return (
    <section className="py-20">
      <div className="container-x grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map((t, i) => (
          <div key={t} className="flex items-start gap-4">
            <span className="font-serif text-gold text-xl mt-0.5">0{i + 1}</span>
            <p className="font-serif text-xl leading-snug text-foreground">{t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
