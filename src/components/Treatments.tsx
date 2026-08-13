import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { publicContent } from "@content/public-content";
import {
  treatmentIntentWireIds,
  type TreatmentIntent,
} from "@/domain/journey/treatment-intent-catalogue";

type Treatment = {
  tag: string;
  title: string;
  to: "/start" | "/peptides";
  intent?: TreatmentIntent;
  isNew?: boolean;
};

const treatments = publicContent.homepage.treatments.items as readonly Treatment[];

export function Treatments() {
  return (
    <section id="treatments" className="py-20 border-t border-border/50">
      <div className="container-x">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl max-w-2xl leading-tight">
            {publicContent.homepage.treatments.title}
          </h2>
          <Link to="/start" className="text-sm text-gold hover:underline underline-offset-4">
            {publicContent.homepage.treatments.action}
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {treatments.map((t, i) => {
            // On lg: first 4 span 3 cols each (2x2), 5th spans all 6 as a feature row
            const lgSpan = i < 4 ? "lg:col-span-3" : "lg:col-span-6";
            const content = (
              <>
                <div className="flex items-center gap-3">
                  <p className="label-caps text-muted-foreground">{t.tag}</p>
                  {t.isNew && (
                    <span className="label-caps text-[10px] px-2 py-0.5 rounded-full border border-gold/50 text-gold">
                      New
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-serif text-2xl sm:text-3xl text-foreground">{t.title}</h3>
                <div className="mt-8 flex items-center justify-end">
                  <ArrowUpRight
                    size={20}
                    className="text-muted-foreground group-hover:text-gold group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </>
            );
            const className = `group relative w-full p-8 rounded-2xl bg-surface border text-left transition-colors ${lgSpan} ${
              t.isNew
                ? "border-gold/40 hover:border-gold/70 bg-gradient-to-br from-surface to-surface/60"
                : "border-border/60 hover:border-gold/50"
            }`;

            return t.intent ? (
              <form key={t.tag} action="/api/journey/intent" method="post" className={lgSpan}>
                <input type="hidden" name="selection" value={treatmentIntentWireIds[t.intent]} />
                <button type="submit" className={className}>
                  {content}
                </button>
              </form>
            ) : (
              <Link key={t.tag} to={t.to} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
