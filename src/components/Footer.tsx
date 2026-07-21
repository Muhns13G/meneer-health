import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <p className="font-serif text-foreground">
            Meneer<span className="text-gold">.</span>{" "}
            <span className="text-muted-foreground text-sm ml-2">© 2026</span>
          </p>
          <p className="text-muted-foreground text-sm">Back to your best.</p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
