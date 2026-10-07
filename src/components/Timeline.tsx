import { publicContent } from "@content/public-content";

export function Timeline({
  events: items = publicContent.homepage.timeline.events,
}: {
  events?: ReadonlyArray<{ title: string }>;
}) {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x max-w-3xl">
        <p className="label-caps mb-4">{publicContent.homepage.timeline.eyebrow}</p>
        <h2 className="font-serif text-3xl sm:text-4xl mb-12">
          {publicContent.homepage.timeline.title}
        </h2>

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
