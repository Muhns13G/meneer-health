import meneerMarkUrl from "@/assets/brand/meneer-mark.png";
import { CANONICAL_PUBLIC_ORIGIN } from "@/lib/public-route-policy";

export const PUBLIC_FAVICON = Object.freeze({
  href: meneerMarkUrl,
  type: "image/png",
});

export const PUBLIC_SOCIAL_IMAGE = Object.freeze({
  url: new URL(meneerMarkUrl, CANONICAL_PUBLIC_ORIGIN).toString(),
  secureUrl: new URL(meneerMarkUrl, CANONICAL_PUBLIC_ORIGIN).toString(),
  type: "image/png",
  width: "550",
  height: "370",
  alt: "Meneer Health placeholder brand mark",
});
