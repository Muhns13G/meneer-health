import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

type Treatment = {
  tag: string;
  title: string;
  to: "/start" | "/peptides";
  isNew?: boolean;
};

const treatments: Treatment[] = [
  { tag: "Hair loss", title: "Hair today. Still here tomorrow.", to: "/start" },
  { tag: "Erectile dysfunction", title: "Hard, made easy.", to: "/start" },
  { tag: "Weight management", title: "Less of you, more of you.", to: "/start" },
  { tag: "Testosterone / TRT", title: "Energy you forgot you had.", to: "/start" },
  { tag: "Peptides", title: "Precision, at a cellular level.", to: "/peptides", isNew: true },
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {treatments.map((t, i) => {
            // On lg: first 4 span 3 cols each (2x2), 5th spans all 6 as a feature row
            const lgSpan =
              i < 4 ? "lg:col-span-3" : "lg:col-span-6";
            return (
              <Link
                key={t.tag}
                to={t.to}
                className={`group relative p-8 rounded-2xl bg-surface border transition-colors ${lgSpan} ${
                  t.isNew
                    ? "border-gold/40 hover:border-gold/70 bg-gradient-to-br from-surface to-surface/60"
                    : "border-border/60 hover:border-gold/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <p className="label-caps text-muted-foreground">{t.tag}</p>
                  {t.isNew && (
                    <span className="label-caps text-[10px] px-2 py-0.5 rounded-full border border-gold/50 text-gold">
                      New
                    </span>
                  )}
                </div>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

