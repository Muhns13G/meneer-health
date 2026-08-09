import { describe, expect, it } from "vitest";
import { CAMPAIGNS, getCanonicalCampaignUrl } from "@/lib/campaigns";
import { campaignRedirectFixtures } from "@/test/fixtures/non-production";

describe("campaign configuration", () => {
  it.each(campaignRedirectFixtures)(
    "keeps the $key campaign on the approved start boundary",
    (fixture) => {
      expect(CAMPAIGNS[fixture.key].destination).toBe(fixture.destination);
      expect(CAMPAIGNS[fixture.key].destination).toMatch(/^\/start\?/);
    },
  );

  it("builds canonical campaign URLs on the approved public origin", () => {
    expect(getCanonicalCampaignUrl(CAMPAIGNS.dads.shortPath)).toBe(
      "https://meneerhealth.co.za/go/dads",
    );
    expect(getCanonicalCampaignUrl(CAMPAIGNS.thanksDad.shortPath)).toBe(
      "https://meneerhealth.co.za/go/thanks-dad",
    );
  });
});
