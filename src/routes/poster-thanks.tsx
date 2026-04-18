import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/poster-thanks")({
  component: PosterThanksPage,
  head: () => ({
    meta: [
      { title: "Meneer — Thanks for being a great dad." },
      { name: "description", content: "Meneer poster — Sorted, sir." },
    ],
  }),
});

function PosterThanksPage() {
  return (
    <>
      <style>{`
        @page { size: A1; margin: 0; }
        @media print {
          html, body { background: #0C0F14 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .poster-root { width: 594mm; height: 841mm; }
        }
        .grain::after {
          content: "";
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.08; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
      `}</style>

      <div
        className="poster-root grain relative flex flex-col overflow-hidden"
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "#0C0F14",
          color: "#E8E6E1",
          fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Top: Logo */}
        <header className="flex items-center gap-3 px-[5vw] pt-[4vh]">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: "clamp(36px, 3.2vw, 64px)",
              height: "clamp(36px, 3.2vw, 64px)",
              border: "2px solid #C8A96E",
              color: "#C8A96E",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(18px, 1.6vw, 32px)",
              fontWeight: 600,
            }}
          >
            M
          </div>
          <span
            style={{
              color: "#E8E6E1",
              letterSpacing: "0.32em",
              fontSize: "clamp(11px, 0.95vw, 18px)",
              fontWeight: 500,
            }}
          >
            MENEER
          </span>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-[5vw]">
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 500,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              fontSize: "clamp(56px, 11vw, 220px)",
              margin: 0,
            }}
          >
            <span style={{ color: "#E8E6E1" }}>Thanks for being</span>
            <br />
            <span style={{ color: "#C8A96E", fontStyle: "italic" }}>a great dad.</span>
          </h1>

          <p
            className="mt-[3vh]"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "#E8E6E1",
              fontSize: "clamp(24px, 3.6vw, 64px)",
              lineHeight: 1.2,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Now, this one is for you.
          </p>

          <div
            className="mt-[4vh]"
            style={{
              color: "#9B9A97",
              fontSize: "clamp(15px, 1.4vw, 26px)",
              lineHeight: 1.5,
              maxWidth: "62ch",
            }}
          >
            <p style={{ margin: 0 }}>Energy. Performance. Hair. Weight. Hormones.</p>
            <p style={{ margin: 0 }}>Doctor-led men&rsquo;s health, delivered to your door.</p>
          </div>

          {/* QR + URL */}
          <div className="mt-[5vh] flex flex-col items-center">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: "clamp(140px, 14vw, 240px)",
                height: "clamp(140px, 14vw, 240px)",
                background: "#FFFFFF",
                color: "#0C0F14",
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(28px, 2.8vw, 56px)",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              QR
            </div>
            <p
              style={{
                color: "#C8A96E",
                letterSpacing: "0.24em",
                fontSize: "clamp(11px, 0.9vw, 16px)",
                textTransform: "uppercase",
                margin: "12px 0 0",
              }}
            >
              Scan to start
            </p>
            <p
              style={{
                color: "#C8A96E",
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(18px, 1.8vw, 32px)",
                marginTop: "8px",
                fontWeight: 500,
              }}
            >
              meneer.co.za
            </p>
          </div>
        </main>

        {/* Bottom bar */}
        <footer
          className="flex items-center justify-between px-[5vw] py-[2vh]"
          style={{ background: "#141821" }}
        >
          <div
            style={{
              color: "#9B9A97",
              fontSize: "clamp(10px, 0.8vw, 14px)",
              letterSpacing: "0.05em",
            }}
          >
            <div>HPCSA-registered doctors · Discreet delivery · POPIA-compliant</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>© 2026 Meneer Health (Pty) Ltd</div>
          </div>
          <div
            style={{
              color: "#C8A96E",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: "italic",
              fontSize: "clamp(16px, 1.6vw, 30px)",
            }}
          >
            Sorted, sir.
          </div>
        </footer>
      </div>
    </>
  );
}
