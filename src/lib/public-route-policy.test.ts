import { describe, expect, it } from "vitest";
import {
  getCanonicalPublicUrl,
  isProhibitedIntentQueryKey,
  PUBLIC_ROUTE_POLICIES,
  SAFE_INTENT_POLICY,
} from "@/lib/public-route-policy";

describe("public route policy", () => {
  it("indexes only approved public information routes", () => {
    const indexablePaths = PUBLIC_ROUTE_POLICIES.filter(
      (route) => route.indexing === "index-follow",
    ).map((route) => route.path);

    expect(indexablePaths).toEqual(["/", "/contact", "/privacy", "/terms"]);
    expect(
      PUBLIC_ROUTE_POLICIES.filter((route) => route.indexing === "index-follow").every(
        (route) => route.routeClass === "public" && route.canonicalPath === route.path,
      ),
    ).toBe(true);
  });

  it("keeps journeys, campaigns, redirects and endpoints out of search indexes", () => {
    expect(
      PUBLIC_ROUTE_POLICIES.filter((route) => route.routeClass !== "public").every(
        (route) => route.indexing === "noindex-nofollow" && !("canonicalPath" in route),
      ),
    ).toBe(true);
  });

  it("prohibits health intent in URL query keys", () => {
    expect(SAFE_INTENT_POLICY.healthIntentInUrl).toBe("prohibited");
    expect(
      ["condition", "Diagnosis", " health_intent ", "medication", "symptom", "treatment"].every(
        isProhibitedIntentQueryKey,
      ),
    ).toBe(true);
    expect(
      ["utm_source", "utm_medium", "utm_campaign"].every((key) => !isProhibitedIntentQueryKey(key)),
    ).toBe(true);
  });

  it("builds absolute canonicals without accepting queries or fragments", () => {
    expect(getCanonicalPublicUrl("/privacy")).toBe("https://meneerhealth.co.za/privacy");
    expect(() => getCanonicalPublicUrl("/start?treatment=peptides")).toThrow(
      "CANONICAL_PATH_INVALID",
    );
    expect(() => getCanonicalPublicUrl("https://example.invalid/privacy")).toThrow(
      "CANONICAL_PATH_INVALID",
    );
  });
});
