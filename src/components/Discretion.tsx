import { Eye, Package, Lock } from "lucide-react";

const cards = [
  { Icon: Eye, title: "Browse like a ghost", body: "No login to look around. Your search history doesn't follow you home until you decide it should." },
  { Icon: Package, title: "Boxed in beige", body: "Unmarked box. Neutral sender. No 'CONFIDENTIAL' stickers screaming the opposite." },
  { Icon: Lock, title: "Locked-down records", body: "POPIA-compliant. Encrypted. Shared with absolutely nobody — not even your medical aid, unless you say so." },
];

export function Discretion() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="container-x">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-3xl leading-tight mb-14">
          Built so quietly, even your group chat won't know.
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
