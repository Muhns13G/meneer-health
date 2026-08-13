import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { publicContent } from "@content/public-content";
import logoAsset from "@/assets/brand/meneer-mark.png";

type PrimaryNavLink = Readonly<{
  label: string;
  to: "/" | "/peptides";
  hash?: "treatments" | "how";
}>;

const links = publicContent.navigation.primary satisfies readonly PrimaryNavLink[];

export function Nav() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const previousLocationHref = useRef(locationHref);

  const closeMenu = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => firstMobileLinkRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (previousLocationHref.current !== locationHref) {
      setOpen(false);
      previousLocationHref.current = locationHref;
    }
  }, [locationHref]);

  useEffect(() => {
    if (!open) return;

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        closeMenu();
      }
    };
    const dismissAtDesktop = () => {
      if (window.innerWidth >= 768) closeMenu();
    };

    document.addEventListener("keydown", dismissOnEscape);
    document.addEventListener("pointerdown", dismissOutside);
    window.addEventListener("resize", dismissAtDesktop);
    return () => {
      document.removeEventListener("keydown", dismissOnEscape);
      document.removeEventListener("pointerdown", dismissOutside);
      window.removeEventListener("resize", dismissAtDesktop);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50"
    >
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
            {publicContent.navigation.startLabel}
          </Link>
        </div>

        <button
          ref={triggerRef}
          type="button"
          className="md:hidden text-foreground"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-primary-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-primary-navigation"
          aria-label="Mobile primary navigation"
          className="md:hidden border-t border-border/50 bg-background"
        >
          <div className="container-x flex flex-col py-4 gap-4">
            {links.map((l, index) => (
              <Link
                key={l.label}
                ref={index === 0 ? firstMobileLinkRef : undefined}
                to={l.to}
                hash={"hash" in l ? l.hash : undefined}
                onClick={() => closeMenu()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/start"
              onClick={() => closeMenu()}
              className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-5 py-2.5 text-sm font-medium"
            >
              {publicContent.navigation.startLabel}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
