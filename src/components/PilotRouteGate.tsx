import { Link } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole } from "lucide-react";

type PilotRouteGateProps = {
  eyebrow: string;
  title: string;
  description: string;
  assurance: string;
};

export function PilotRouteGate({ eyebrow, title, description, assurance }: PilotRouteGateProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/50">
        <div className="container-x flex h-16 items-center">
          <Link to="/" className="font-serif text-xl text-foreground">
            Meneer<span className="text-gold">.</span>
          </Link>
        </div>
      </header>

      <main className="container-x flex flex-1 items-center py-16">
        <section className="mx-auto w-full max-w-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <LockKeyhole aria-hidden size={22} className="text-gold" />
          </div>
          <p className="label-caps mt-8 text-gold">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div
            role="status"
            className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted-foreground"
          >
            {assurance}
          </div>

          <Link
            to="/"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold/50"
          >
            <ArrowLeft aria-hidden size={16} className="mr-2" />
            Back to home
          </Link>
        </section>
      </main>
    </div>
  );
}
