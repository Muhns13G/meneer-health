import { describe, expect, it } from "vitest";
import { pilotActivationBlockers } from "@/lib/compliance/pilot-profile";

describe("pilot activation blockers", () => {
  it("keeps every unverified accountable-party boundary closed", () => {
    expect(pilotActivationBlockers).toEqual([
      "Verified clinician identity and HPCSA registration",
      "Verified pharmacy legal identity, Y-number, and responsible pharmacist",
      "Monitored urgent clinical telephone or WhatsApp channel and hours",
    ]);
  });

  it("does not expose development fixture identities in rendered blocker copy", () => {
    expect(pilotActivationBlockers.join(" ")).not.toMatch(/PLACEHOLDER|John Doe|Jane Doe/);
  });
});
