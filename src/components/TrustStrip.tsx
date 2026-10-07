import { ShieldCheck, Package, Lock, Clock } from "lucide-react";
import { publicContent } from "@content/public-content";

const items = [
  { Icon: ShieldCheck, text: publicContent.homepage.trust[0] },
  { Icon: Package, text: publicContent.homepage.trust[1] },
  { Icon: Lock, text: publicContent.homepage.trust[2] },
  { Icon: Clock, text: publicContent.homepage.trust[3] },
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
