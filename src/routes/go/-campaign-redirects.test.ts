import { describe, expect, it } from "vitest";
import { Route as DadsRoute } from "@/routes/go/dads";
import { Route as ThanksDadRoute } from "@/routes/go/thanks-dad";
import { campaignRedirectFixtures } from "@/test/fixtures/non-production";

const campaignBeforeLoads = {
  dads: DadsRoute.options.beforeLoad,
  thanksDad: ThanksDadRoute.options.beforeLoad,
};

describe("campaign route redirects", () => {
  it.each(campaignRedirectFixtures)("redirects $key with approved attribution", async (fixture) => {
    const beforeLoad = campaignBeforeLoads[fixture.key];
    let thrown: unknown;

    try {
      await beforeLoad?.({} as never);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(307);
    expect((thrown as Response).headers.get("location")).toBe(fixture.destination);
  });
});
