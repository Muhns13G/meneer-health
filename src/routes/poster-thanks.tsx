import { createFileRoute } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
import { PilotRouteGate } from "@/components/PilotRouteGate";
import meneerMark from "@/assets/brand/meneer-mark.png";
import { CAMPAIGNS, getCanonicalCampaignUrl } from "@/lib/campaigns";
import { publicEnvironment } from "@/config/public-environment";

const CAMPAIGN_PRINT_PROOF_ENABLED = publicEnvironment.campaignPrintProof;

export const Route = createFileRoute("/poster-thanks")({
  component: PosterThanksRoute,
  head: () => ({
    meta: [
      { title: publicContent.metadata.posterThanks.title },
      { name: "description", content: publicContent.metadata.posterThanks.description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function PosterThanksRoute() {
  if (CAMPAIGN_PRINT_PROOF_ENABLED) {
    return <PosterThanksPage />;
  }

  return (
    <PilotRouteGate
      eyebrow={publicContent.routeGates.campaign.eyebrow}
      title={publicContent.routeGates.campaign.title}
      description={publicContent.routeGates.campaign.description}
      assurance={publicContent.routeGates.campaign.assurance}
    />
  );
}

// Preserved campaign concept: keep inaccessible until approved assets are verified and cut over.
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
        .proof-label {
          position: absolute; top: 12mm; right: 12mm; z-index: 10;
          border: 1px solid #C8A96E; color: #C8A96E; background: #0C0F14;
          padding: 3mm 5mm; font: 600 10pt/1.2 ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.12em; text-transform: uppercase;
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
        <div className="proof-label">Internal print proof · not for distribution</div>
        {/* Top: Logo */}
        <header className="flex items-center gap-3 px-[5vw] pt-[4vh]">
          <img
            src={meneerMark}
            alt="Meneer"
            style={{ width: "clamp(54px, 4.8vw, 96px)", height: "auto" }}
          />
          <span
            style={{
              color: "#E8E6E1",
              letterSpacing: "0.32em",
              fontSize: "clamp(11px, 0.95vw, 18px)",
              fontWeight: 500,
            }}
          >
            {publicContent.campaigns.shared.brand}
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
            <span style={{ color: "#E8E6E1" }}>
              {publicContent.campaigns.thanksDad.headlineLead}
            </span>
            <br />
            <span style={{ color: "#C8A96E", fontStyle: "italic" }}>
              {publicContent.campaigns.thanksDad.headlineEnd}
            </span>
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
            {publicContent.campaigns.thanksDad.subheading}
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
            {publicContent.campaigns.thanksDad.body.map((line) => (
              <p key={line} style={{ margin: 0 }}>
                {line}
              </p>
            ))}
          </div>

          {/* QR + URL */}
          <div className="mt-[5vh] flex flex-col items-center">
            <div
              className="flex items-center justify-center rounded-2xl bg-white p-3"
              style={{
                width: "clamp(140px, 14vw, 240px)",
                height: "clamp(140px, 14vw, 240px)",
              }}
            >
              <img
                src={CAMPAIGNS.thanksDad.qrPath}
                alt={`QR code to ${getCanonicalCampaignUrl(CAMPAIGNS.thanksDad.shortPath)}`}
                className="h-full w-full"
              />
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
              {publicContent.campaigns.shared.scanAction}
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
              {publicContent.campaigns.thanksDad.canonicalLabel}
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
            <div>{publicContent.campaigns.shared.trustLine}</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              {publicContent.campaigns.shared.operatorLine}
            </div>
          </div>
          <div
            style={{
              color: "#C8A96E",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: "italic",
              fontSize: "clamp(16px, 1.6vw, 30px)",
            }}
          >
            {publicContent.campaigns.shared.signoff}
          </div>
        </footer>
      </div>
    </>
  );
}
