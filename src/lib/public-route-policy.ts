export const CANONICAL_PUBLIC_ORIGIN = "https://meneerhealth.co.za";

export type RouteClass = "public" | "restricted" | "campaign" | "redirect" | "internal";
export type IndexingPolicy = "index-follow" | "noindex-nofollow";

export type PublicRoutePolicy = Readonly<{
  path: string;
  routeClass: RouteClass;
  indexing: IndexingPolicy;
  canonicalPath?: string;
}>;

export const PUBLIC_ROUTE_POLICIES = [
  { path: "/", routeClass: "public", indexing: "index-follow", canonicalPath: "/" },
  {
    path: "/contact",
    routeClass: "public",
    indexing: "index-follow",
    canonicalPath: "/contact",
  },
  {
    path: "/privacy",
    routeClass: "public",
    indexing: "index-follow",
    canonicalPath: "/privacy",
  },
  {
    path: "/terms",
    routeClass: "public",
    indexing: "index-follow",
    canonicalPath: "/terms",
  },
  { path: "/start", routeClass: "restricted", indexing: "noindex-nofollow" },
  { path: "/peptides", routeClass: "restricted", indexing: "noindex-nofollow" },
  { path: "/poster", routeClass: "campaign", indexing: "noindex-nofollow" },
  { path: "/poster-thanks", routeClass: "campaign", indexing: "noindex-nofollow" },
  { path: "/go/dads", routeClass: "redirect", indexing: "noindex-nofollow" },
  { path: "/go/thanks-dad", routeClass: "redirect", indexing: "noindex-nofollow" },
  {
    path: "/api/journey/intent",
    routeClass: "internal",
    indexing: "noindex-nofollow",
  },
  {
    path: "/api/payments/checkout",
    routeClass: "internal",
    indexing: "noindex-nofollow",
  },
  {
    path: "/api/payments/stripe/webhook",
    routeClass: "internal",
    indexing: "noindex-nofollow",
  },
] as const satisfies readonly PublicRoutePolicy[];

export const INDEXABLE_PUBLIC_ROUTES = PUBLIC_ROUTE_POLICIES.filter(
  (route) => route.indexing === "index-follow",
);

const ROBOTS_DISALLOW_PATHS = ["/api/", "/go/", "/peptides", "/poster", "/start"] as const;

const prohibitedIntentQueryKeys = new Set([
  "condition",
  "diagnosis",
  "health_intent",
  "medication",
  "symptom",
  "treatment",
]);

export const SAFE_INTENT_POLICY = Object.freeze({
  healthIntentInUrl: "prohibited",
  campaignAttribution: "allowlisted-non-clinical-only",
  unsupportedIntent: "fail-closed",
} as const);

export function isProhibitedIntentQueryKey(key: string): boolean {
  return prohibitedIntentQueryKeys.has(key.trim().toLowerCase());
}

export function getCanonicalPublicUrl(path: string): string {
  if (!/^\/(?:[^?#]*)$/.test(path)) {
    throw new Error("CANONICAL_PATH_INVALID");
  }
  return new URL(path, CANONICAL_PUBLIC_ORIGIN).toString();
}

export function isIndexablePublicPath(path: string): boolean {
  return INDEXABLE_PUBLIC_ROUTES.some((route) => route.path === path);
}

export function renderRobotsTxt(): string {
  return [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${getCanonicalPublicUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function renderSitemapXml(): string {
  const urls = INDEXABLE_PUBLIC_ROUTES.map(
    (route) => `  <url>\n    <loc>${getCanonicalPublicUrl(route.path)}</loc>\n  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
