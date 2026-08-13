import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { retainedPublicClaimRegister } from "../contracts/retained-public-claims";
import { publicContentGovernance } from "./public-content-governance";
import { publicContent } from "./public-content";

const migratedConsumers = publicContentGovernance.migratedConsumers;

const sourceFor = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function claimVariant(claimId: string, variantId: string) {
  return retainedPublicClaimRegister.claims
    .find((claim) => claim.claimId === claimId)
    ?.variants.find((variant) => variant.variantId === variantId);
}

describe("canonical public-content source", () => {
  it("keeps every migrated runtime consumer attached to the framework-neutral source", () => {
    for (const path of migratedConsumers) {
      expect(sourceFor(path), path).toContain("@content/public-content");
    }
  });

  it("preserves established brand and proposition wording", () => {
    expect(publicContent.brand.tagline).toBe("Back to your best.");
    expect(publicContent.homepage.hero.title).toBe("The care you've quietly been wanting.");
    expect(publicContent.metadata.start.title).toBe("Start your private consult — Meneer");
    expect(publicContent.homepage.treatments.items[4]).toMatchObject({
      tag: "Peptides",
      title: "Precision, at a cellular level.",
      to: "/peptides",
    });
  });

  it("uses only the three owner-approved timing replacements in runtime content", () => {
    expect(publicContent.homepage.trust[3]).toBe(
      "Initial clinical review targeted within 48 hours of a complete intake.",
    );
    expect(publicContent.homepage.cta.body).toBe(
      "Five minutes of honesty. A real doctor on the other side. If treatment is approved, pharmacy and delivery follow.",
    );
    expect(publicContent.journey.confirmation[4]).toEqual({
      title: "Medication delivered to your door",
      when: "Target 3–5 business days after fulfilment approval",
    });

    const runtimeSource = migratedConsumers.map(sourceFor).join("\n");
    expect(runtimeSource).not.toContain("Booked & dosed inside 48 hours.");
    expect(runtimeSource).not.toContain("Treatment in the post by the weekend.");
    expect(runtimeSource).not.toContain('when: "2–3 business days"');
  });

  it("binds each replacement to its pending-evidence claim variant", () => {
    expect(claimVariant("claim.service-timing", "timing.initial-review-48-hours")).toMatchObject({
      exactText: publicContent.homepage.trust[3],
      status: "pending-evidence",
      ownerDirection: "retain",
    });
    expect(
      claimVariant("claim.service-timing", "timing.conditional-pharmacy-delivery"),
    ).toMatchObject({
      exactText: publicContent.homepage.cta.body,
      status: "pending-evidence",
      ownerDirection: "retain",
    });
    expect(claimVariant("claim.service-timing", "timing.delivery-three-five-days")).toMatchObject({
      exactText: publicContent.journey.confirmation[4].when,
      status: "pending-evidence",
      ownerDirection: "retain",
    });
  });

  it("keeps campaign routing and support channels in the same source", () => {
    expect(publicContent.campaigns.dads.destination).toBe(
      "/start?utm_source=offline&utm_medium=poster&utm_campaign=dads",
    );
    expect(publicContent.campaigns.thanksDad.shortPath).toBe("/go/thanks-dad");
    expect(publicContent.support.general).toMatchObject({
      email: "support@meneerhealth.co.za",
      owner: "OCTOTHORP ZA",
      monitoring: "Monitored daily",
    });
    expect(publicContent.support.emergency.mobile.href).toBe("tel:112");
  });
});
