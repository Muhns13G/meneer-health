export const activeRoutes = [
  {
    path: "/",
    title: "Meneer — Back to your best. Men's health, delivered in ZA",
    heading: "The care you've quietly been wanting.",
  },
  { path: "/peptides", title: "Peptides — Meneer", heading: "Peptide access is currently gated." },
  {
    path: "/start",
    title: "Start your private consult — Meneer",
    heading: "Start your private consult",
  },
  { path: "/contact", title: "Contact — Meneer", heading: "Contact" },
  {
    path: "/privacy",
    title: "Website Privacy Notice — Meneer",
    heading: "Website Privacy Notice",
  },
  { path: "/terms", title: "Website Terms — Meneer", heading: "Website Terms" },
  {
    path: "/poster",
    title: "Meneer — Dads, this one is for you.",
    heading: "This campaign is not currently active.",
  },
  {
    path: "/poster-thanks",
    title: "Meneer — Thanks for being a great dad.",
    heading: "This campaign is not currently active.",
  },
] as const;

export const retiredRoutes = [
  "/mcp",
  "/.mcp/list-tools",
  "/.well-known/oauth-protected-resource",
  "/definitely-not-a-route",
] as const;

export const campaignRedirects = [
  {
    path: "/go/dads",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=dads",
  },
  {
    path: "/go/thanks-dad",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad",
  },
] as const;
