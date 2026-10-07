import { Eye, Package, Lock } from "lucide-react";
import { publicContent } from "@content/public-content";

const cards = [
  {
    Icon: Eye,
    ...publicContent.homepage.discretion.cards[0],
  },
  {
    Icon: Package,
    ...publicContent.homepage.discretion.cards[1],
  },
  {
    Icon: Lock,
    ...publicContent.homepage.discretion.cards[2],
  },
];

export function Discretion() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-3xl leading-tight mb-14">
          {publicContent.homepage.discretion.title}
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {cards.map(({ Icon, title, body }) => (
            <div key={title} className="p-8 rounded-2xl bg-surface border border-border/60">
              <Icon size={22} className="text-gold" />
              <h3 className="mt-6 font-serif text-2xl text-foreground">{title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
