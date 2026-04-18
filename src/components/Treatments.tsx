import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

const treatments = [
  { tag: "Hair loss", title: "Hair today. Still here tomorrow." },
  { tag: "Erectile dysfunction", title: "Hard, made easy." },
  { tag: "Weight management", title: "Less of you, more of you." },
  { tag: "Testosterone / TRT", title: "Energy you forgot you had." },
];

export function Treatments() {
  return (
    <section id="treatments" className="py-20 border-t border-border/50">
      <div className="container-x">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight">
            The care you've always deserved.
          </h2>
          <Link to="/start" className="text-sm text-gold hover:underline underline-offset-4">
            Find your match →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {treatments.map((t) => (
            <Link
              key={t.tag}
              to="/start"
              className="group relative p-8 rounded-2xl bg-surface border border-border/60 hover:border-gold/50 transition-colors"
            >
              <p className="label-caps text-muted-foreground">{t.tag}</p>
              <h3 className="mt-4 font-serif text-2xl sm:text-3xl text-foreground">
                {t.title}
              </h3>
              <div className="mt-8 flex items-center justify-end">
                <ArrowUpRight
                  size={20}
                  className="text-muted-foreground group-hover:text-gold group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
