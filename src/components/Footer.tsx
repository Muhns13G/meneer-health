export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-serif text-foreground">
          Meneer<span className="text-gold">.</span>{" "}
          <span className="text-muted-foreground text-sm ml-2">© 2026</span>
        </p>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
