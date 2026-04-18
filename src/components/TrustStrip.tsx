import { ShieldCheck, Package, Lock, Clock } from "lucide-react";

const items = [
  { Icon: ShieldCheck, text: "HPCSA-registered. Real doctors. No bots." },
  { Icon: Package, text: "Plain box. Neutral sender. Nobody's the wiser." },
  { Icon: Lock, text: "POPIA-tight. Your business stays your business." },
  { Icon: Clock, text: "Booked & dosed inside 48 hours." },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border/50 bg-surface/40">
      <div className="container-x py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map(({ Icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <Icon size={18} className="text-gold mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
