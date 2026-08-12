import { isIndexablePublicPath } from "@/lib/public-route-policy";
import { GOOGLE_FONTS_FILE_ORIGIN, GOOGLE_FONTS_STYLESHEET_ORIGIN } from "@/lib/public-font-policy";

const ONE_YEAR_SECONDS = 31_536_000;
const ONE_HOUR_SECONDS = 3_600;

const SENSITIVE_ROUTE_PREFIXES = ["/start", "/peptides"] as const;
const PUBLIC_DOCUMENT_ROUTES = new Set([
  "/",
  "/contact",
  "/poster",
  "/poster-thanks",
  "/privacy",
  "/terms",
]);

const BASE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLESHEET_ORIGIN}`,
  `font-src 'self' ${GOOGLE_FONTS_FILE_ORIGIN}`,
  "img-src 'self' data: https:",
  "media-src 'self' https:",
  "connect-src 'self'",
] as const;

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

export type ResponseClass =
  | "error"
  | "redirect"
  | "sensitive"
  | "fingerprinted-asset"
  | "public-asset"
  | "public-document";

function isRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_ROUTE_PREFIXES.some((prefix) => isRoutePrefix(pathname, prefix));
}

function isFingerprintAsset(pathname: string): boolean {
  return pathname.startsWith("/assets/");
}

function isPublicAsset(pathname: string): boolean {
  return pathname.startsWith("/campaigns/");
}

export function classifyResponse(request: Request, response: Response): ResponseClass {
  const { pathname } = new URL(request.url);

  if (response.status >= 400) {
    return "error";
  }

  if (response.status >= 300 && response.status < 400) {
    return "redirect";
  }

  if (isSensitiveRoute(pathname)) {
    return "sensitive";
  }

  if (isFingerprintAsset(pathname)) {
    return "fingerprinted-asset";
  }

  if (isPublicAsset(pathname)) {
    return "public-asset";
  }

  return PUBLIC_DOCUMENT_ROUTES.has(pathname) ? "public-document" : "sensitive";
}

function cacheControlFor(
  request: Request,
  response: Response,
  responseClass: ResponseClass,
): string {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return "private, no-store, max-age=0";
  }

  if (response.headers.has("Set-Cookie")) {
    return "private, no-store, max-age=0";
  }

  switch (responseClass) {
    case "fingerprinted-asset":
      return `public, max-age=${ONE_YEAR_SECONDS}, immutable`;
    case "public-asset":
      return `public, max-age=${ONE_HOUR_SECONDS}, must-revalidate`;
    case "public-document":
      return "public, max-age=0, must-revalidate";
    case "error":
    case "redirect":
    case "sensitive":
      return "private, no-store, max-age=0";
  }
}

function contentSecurityPolicy(protocol: string, nonce?: string): string {
  const directives: string[] = [...BASE_CONTENT_SECURITY_POLICY];
  directives.push(nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self'");

  if (protocol === "https:") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applyResponsePolicy(
  request: Request,
  response: Response,
  nonce?: string,
): Response {
  const requestUrl = new URL(request.url);
  const responseClass = classifyResponse(request, response);
  const headers = new Headers(response.headers);

  headers.set("Cache-Control", cacheControlFor(request, response, responseClass));
  if (nonce || !headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", contentSecurityPolicy(requestUrl.protocol, nonce));
  }
  headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");

  const isIndexableDocument =
    responseClass === "public-document" && isIndexablePublicPath(requestUrl.pathname);
  const isAsset = responseClass === "fingerprinted-asset" || responseClass === "public-asset";

  if (!isIndexableDocument && !isAsset) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  } else {
    headers.delete("X-Robots-Tag");
  }

  if (requestUrl.protocol === "https:") {
    headers.set("Strict-Transport-Security", `max-age=${ONE_YEAR_SECONDS}`);
  } else {
    headers.delete("Strict-Transport-Security");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
