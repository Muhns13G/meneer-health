import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logoAsset from "@/assets/brand/meneer-mark.png";

type PrimaryNavLink = Readonly<{
  label: string;
  to: "/" | "/peptides";
  hash?: "treatments" | "how";
}>;

const links = [
  { label: "Hair Loss", to: "/", hash: "treatments" },
  { label: "ED", to: "/", hash: "treatments" },
  { label: "Weight", to: "/", hash: "treatments" },
  { label: "Testosterone", to: "/", hash: "treatments" },
  { label: "Peptides", to: "/peptides" },
  { label: "How It Works", to: "/", hash: "how" },
] as const satisfies readonly PrimaryNavLink[];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="container-x flex items-center justify-between h-16">
        <Link
          to="/"
          className="flex items-center gap-3 font-serif text-2xl tracking-tight text-foreground"
        >
          <img src={logoAsset} alt="Meneer MNR mark" className="h-9 w-auto" />
          <span>
            Meneer<span className="text-gold">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={"hash" in l ? l.hash : undefined}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/start"
            className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            Start privately
          </Link>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 bg-background">
          <div className="container-x flex flex-col py-4 gap-4">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                hash={"hash" in l ? l.hash : undefined}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/start"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-5 py-2.5 text-sm font-medium"
            >
              Start privately
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
