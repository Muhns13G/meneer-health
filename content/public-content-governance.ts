import { publicContent } from "./public-content";

export const canonicalJourneyPhaseIds = [
  "pathway-and-intake",
  "screening-and-review",
  "consultation-and-decision",
  "price-and-payment",
  "pharmacy-and-delivery",
] as const;

export type CanonicalJourneyPhaseId = (typeof canonicalJourneyPhaseIds)[number];

const projection = (
  representationId: string,
  phaseIds: readonly CanonicalJourneyPhaseId[],
  value: unknown,
) => Object.freeze({ representationId, phaseIds, value });

export const publicContentGovernance = Object.freeze({
  contract: "public-content.runtime-map",
  version: 1,
  sourceVersion: publicContent.sourceVersion,
  defaultLocale: "en-ZA",
  migratedConsumers: Object.freeze([
    "src/components/Benefits.tsx",
    "src/components/CtaSection.tsx",
    "src/components/Discretion.tsx",
    "src/components/Doctor.tsx",
    "src/components/Footer.tsx",
    "src/components/Hero.tsx",
    "src/components/HowItWorks.tsx",
    "src/components/Nav.tsx",
    "src/components/Timeline.tsx",
    "src/components/Treatments.tsx",
    "src/components/TrustStrip.tsx",
    "src/lib/campaigns.ts",
    "src/lib/support-channels.ts",
    "src/routes/__root.tsx",
    "src/routes/contact.tsx",
    "src/routes/index.tsx",
    "src/routes/peptides.tsx",
    "src/routes/poster-thanks.tsx",
    "src/routes/poster.tsx",
    "src/routes/privacy.tsx",
    "src/routes/start.tsx",
    "src/routes/terms.tsx",
  ] as const),
  journey: Object.freeze({
    phaseIds: canonicalJourneyPhaseIds,
    projections: Object.freeze({
      marketingThreeStep: Object.freeze([
        projection(
          "journey.marketing.step-01",
          ["pathway-and-intake"],
          publicContent.homepage.howItWorks.steps[0],
        ),
        projection(
          "journey.marketing.step-02",
          ["screening-and-review", "consultation-and-decision"],
          publicContent.homepage.howItWorks.steps[1],
        ),
        projection(
          "journey.marketing.step-03",
          ["price-and-payment", "pharmacy-and-delivery"],
          publicContent.homepage.howItWorks.steps[2],
        ),
      ]),
      journeyFourEvent: Object.freeze([
        projection(
          "journey.timeline.event-01",
          ["pathway-and-intake"],
          publicContent.homepage.timeline.events[0],
        ),
        projection(
          "journey.timeline.event-02",
          ["screening-and-review", "consultation-and-decision"],
          publicContent.homepage.timeline.events[1],
        ),
        projection(
          "journey.timeline.event-03",
          ["consultation-and-decision", "pharmacy-and-delivery"],
          publicContent.homepage.timeline.events[2],
        ),
        projection(
          "journey.timeline.event-04",
          ["pharmacy-and-delivery"],
          publicContent.homepage.timeline.events[3],
        ),
      ]),
      intakeProgress: Object.freeze(
        publicContent.journey.intakeProgress.map((value, index) =>
          projection(`journey.intake.step-0${index + 1}`, ["pathway-and-intake"], value),
        ),
      ),
      detailedConfirmation: Object.freeze([
        projection(
          "journey.confirmation.event-01",
          ["screening-and-review"],
          publicContent.journey.confirmation[0],
        ),
        projection(
          "journey.confirmation.event-02",
          ["screening-and-review"],
          publicContent.journey.confirmation[1],
        ),
        projection(
          "journey.confirmation.event-03",
          ["consultation-and-decision"],
          publicContent.journey.confirmation[2],
        ),
        projection(
          "journey.confirmation.event-04",
          ["consultation-and-decision"],
          publicContent.journey.confirmation[3],
        ),
        projection(
          "journey.confirmation.event-05",
          ["price-and-payment", "pharmacy-and-delivery"],
          publicContent.journey.confirmation[4],
        ),
      ]),
      campaignMetadata: Object.freeze([
        projection(
          "journey.metadata.start",
          ["pathway-and-intake", "consultation-and-decision", "pharmacy-and-delivery"],
          publicContent.metadata.start.description,
        ),
      ]),
    }),
  }),
  treatments: Object.freeze(
    publicContent.homepage.treatments.items.map((value, index) =>
      Object.freeze({
        contentId: `treatment.${"intent" in value ? value.intent : "peptides"}`,
        value,
        navigation: publicContent.navigation.primary[index],
      }),
    ),
  ),
  policies: Object.freeze([
    Object.freeze({
      contentId: "policy.privacy",
      navigation: publicContent.navigation.footer[0],
      metadata: publicContent.metadata.privacy,
    }),
    Object.freeze({
      contentId: "policy.terms",
      navigation: publicContent.navigation.footer[1],
      metadata: publicContent.metadata.terms,
    }),
  ]),
  support: Object.freeze([
    Object.freeze({ contentId: "support.general", value: publicContent.support.general }),
    Object.freeze({
      contentId: "support.emergency.mobile",
      value: publicContent.support.emergency.mobile,
    }),
    Object.freeze({
      contentId: "support.emergency.ambulance",
      value: publicContent.support.emergency.ambulance,
    }),
    ...Object.entries(publicContent.support.dedicated).map(([purpose, availability]) =>
      Object.freeze({ contentId: `support.${purpose}`, value: availability }),
    ),
  ]),
  trust: Object.freeze([
    Object.freeze({
      contentId: "trust.practitioner-registration",
      claimId: "claim.practitioner-registration",
      variantId: "practitioner.truststrip",
      value: publicContent.homepage.trust[0],
    }),
    Object.freeze({
      contentId: "trust.discreet-fulfilment",
      claimId: "claim.discreet-fulfilment",
      variantId: "fulfilment.truststrip-plain-box",
      value: publicContent.homepage.trust[1],
    }),
    Object.freeze({
      contentId: "trust.privacy-compliance",
      claimId: "claim.privacy-compliance",
      variantId: "privacy.truststrip",
      value: publicContent.homepage.trust[2],
    }),
    Object.freeze({
      contentId: "trust.initial-review-timing",
      claimId: "claim.service-timing",
      variantId: "timing.initial-review-48-hours",
      value: publicContent.homepage.trust[3],
    }),
  ]),
});
