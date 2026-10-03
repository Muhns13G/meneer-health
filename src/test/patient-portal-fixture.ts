import type { PortalAccount } from "@/domain/identity/patient-portal";

export const portalAccountFixture: PortalAccount = {
  profile: {
    givenName: "Synthetic",
    familyName: "Client",
    verifiedEmail: "portal@example.invalid",
    mobileE164: "+27820000000",
    mobileVerificationStatus: "pending",
    contactPreference: "whatsapp",
    status: "active",
    version: 1,
    createdAt: "2026-10-02T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
  },
  instruments: [
    {
      publicationId: "97000000-0000-4000-8000-000000000004",
      instrumentId: "pilot-account-terms",
      version: "1.0",
      locale: "en-ZA",
      contentHash: "a".repeat(64),
      body: "Synthetic account terms only.",
      effectiveAt: "2026-10-02T00:00:00Z",
      action: "accepted",
      recordedAt: "2026-10-03T00:00:00Z",
    },
    {
      publicationId: "97000000-0000-4000-8000-000000000005",
      instrumentId: "pilot-privacy-notice",
      version: "1.0",
      locale: "en-ZA",
      contentHash: "b".repeat(64),
      body: "Synthetic privacy notice only.",
      effectiveAt: "2026-10-02T00:00:00Z",
      action: "acknowledged",
      recordedAt: "2026-10-03T00:00:00Z",
    },
  ],
  workflows: [],
};
