export const campaignRedirectFixtures = [
  {
    key: "dads",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=dads",
  },
  {
    key: "thanksDad",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad",
  },
] as const;

export const pilotGateFixture = {
  eyebrow: "Synthetic test campaign",
  title: "Test route remains inactive",
  description: "No form, health information, or external submission is enabled in this fixture.",
  assurance: "This is non-production test content from the reserved .invalid domain boundary.",
} as const;

export const syntheticError = new Error("Synthetic test failure with no patient information");
