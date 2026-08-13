import { Link } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
import logoAsset from "@/assets/brand/meneer-mark.png";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logoAsset} alt="Meneer MNR mark" className="h-7 w-auto" />
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <p className="font-serif text-foreground">
              {publicContent.brand.name}
              <span className="text-gold">.</span>{" "}
              <span className="text-muted-foreground text-sm ml-2">
                © {publicContent.brand.copyrightYear}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">{publicContent.brand.tagline}</p>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          {publicContent.navigation.footer.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
