import { publicClaimRegisterSchema } from "./public-claims";
import { publicContent } from "../content/public-content";

const pending = (input: {
  variantId: string;
  exactText: string;
  sources: Array<{ path: string; locator: string; channel: string }>;
  allowedChannels: string[];
  dispositionReason: string;
}) => ({
  ...input,
  audiences: ["public"],
  status: "pending-evidence",
  ownerDirection: "retain",
  effectiveFrom: null,
  reviewAt: null,
  expiresAt: null,
  approvals: [],
  evidence: [],
  withdrawal: null,
  archive: null,
});

const rejected = (input: {
  variantId: string;
  exactText: string;
  sources: Array<{ path: string; locator: string; channel: string }>;
  allowedChannels: string[];
  dispositionReason: string;
}) => ({
  ...input,
  audiences: ["public"],
  status: "rejected",
  ownerDirection: "replace",
  effectiveFrom: null,
  reviewAt: null,
  expiresAt: null,
  approvals: [],
  evidence: [],
  withdrawal: null,
  archive: null,
});

export const retainedPublicClaimRegister = publicClaimRegisterSchema.parse({
  contract: "public-claims.register",
  version: 1,
  registerVersion: "2026.08.13.1",
  generatedAt: "2026-08-13T00:00:00Z",
  claims: [
    {
      claimId: "claim.practitioner-registration",
      family: "practitioner-registration",
      accountableOwner: "clinical-owner",
      requiredApprovers: ["clinical-owner", "legal-privacy-owner", "release-owner"],
      evidenceRequirements: [
        {
          requirementId: "practitioner.current-register",
          kind: "official-register",
          description:
            "Named clinician identity, current HPCSA register result, applicable scope, and contractual role.",
        },
        {
          requirementId: "practitioner.clinical-approval",
          kind: "clinical-approval",
          description: "Clinical owner approval of the exact channel wording and review cadence.",
        },
      ],
      variants: [
        pending({
          variantId: "practitioner.metadata-real-doctors",
          exactText: publicContent.metadata.root.description,
          sources: [
            { path: "src/routes/__root.tsx", locator: "root description", channel: "metadata" },
            { path: "src/routes/index.tsx", locator: "homepage description", channel: "metadata" },
          ],
          allowedChannels: ["metadata"],
          dispositionReason: "Retained at owner direction; named register evidence is pending.",
        }),
        pending({
          variantId: "practitioner.truststrip",
          exactText: publicContent.homepage.trust[0],
          sources: [
            {
              path: "src/components/TrustStrip.tsx",
              locator: "trust strip item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; named register evidence is pending.",
        }),
        pending({
          variantId: "practitioner.homepage-doctor",
          exactText: publicContent.homepage.doctor.assurance,
          sources: [
            {
              path: "src/components/Doctor.tsx",
              locator: "doctor assurance paragraph",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained at owner direction; roster and prescribing-scope evidence are pending.",
        }),
        pending({
          variantId: "practitioner.poster",
          exactText: "HPCSA-registered doctors",
          sources: [
            { path: "src/routes/poster.tsx", locator: "poster footer", channel: "poster" },
            {
              path: "src/routes/poster-thanks.tsx",
              locator: "poster footer",
              channel: "poster",
            },
          ],
          allowedChannels: ["poster"],
          dispositionReason: "Retained at owner direction; named register evidence is pending.",
        }),
        pending({
          variantId: "practitioner.how-it-works",
          exactText: publicContent.homepage.howItWorks.steps[1].body,
          sources: [
            {
              path: "src/components/HowItWorks.tsx",
              locator: "doctor step body",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained at owner direction; roster and availability evidence are pending.",
        }),
      ],
    },
    {
      claimId: "claim.privacy-compliance",
      family: "privacy-compliance",
      accountableOwner: "legal-privacy-owner",
      requiredApprovers: ["legal-privacy-owner", "security-owner", "release-owner"],
      evidenceRequirements: [
        {
          requirementId: "privacy.approved-governance",
          kind: "approved-policy",
          description:
            "Approved responsible-party/operator allocation, data map, policies, operator controls, and Information Officer governance.",
        },
        {
          requirementId: "privacy.control-review",
          kind: "technical-control",
          description:
            "Current privacy/security control review supporting the exact compliance wording.",
        },
      ],
      variants: [
        pending({
          variantId: "privacy.truststrip",
          exactText: publicContent.homepage.trust[2],
          sources: [
            {
              path: "src/components/TrustStrip.tsx",
              locator: "privacy trust item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; domain compliance approval is pending.",
        }),
        pending({
          variantId: "privacy.discretion",
          exactText: "POPIA-compliant.",
          sources: [
            {
              path: "src/components/Discretion.tsx",
              locator: "locked-down records card",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; domain compliance approval is pending.",
        }),
        pending({
          variantId: "privacy.poster",
          exactText: "POPIA-compliant",
          sources: [
            { path: "src/routes/poster.tsx", locator: "poster footer", channel: "poster" },
            {
              path: "src/routes/poster-thanks.tsx",
              locator: "poster footer",
              channel: "poster",
            },
          ],
          allowedChannels: ["poster"],
          dispositionReason: "Retained at owner direction; domain compliance approval is pending.",
        }),
      ],
    },
    {
      claimId: "claim.encryption-and-sharing",
      family: "encryption-and-sharing",
      accountableOwner: "security-owner",
      requiredApprovers: ["security-owner", "legal-privacy-owner", "release-owner"],
      evidenceRequirements: [
        {
          requirementId: "security.production-controls",
          kind: "technical-control",
          description:
            "Production encryption, key, access, sharing, data-flow, vendor, and test evidence for every in-scope record.",
        },
        {
          requirementId: "security.approved-sharing-rule",
          kind: "approved-policy",
          description:
            "Approved disclosure and consent rule, including legally required exceptions.",
        },
      ],
      variants: [
        pending({
          variantId: "security.discretion-encrypted",
          exactText: publicContent.homepage.discretion.cards[2].body,
          sources: [
            {
              path: "src/components/Discretion.tsx",
              locator: "locked-down records card",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained at owner direction; production-wide controls and disclosure exceptions are not yet approved.",
        }),
      ],
    },
    {
      claimId: "claim.pharmacy-licensing",
      family: "pharmacy-licensing",
      accountableOwner: "operations-owner",
      requiredApprovers: [
        "clinical-owner",
        "legal-privacy-owner",
        "operations-owner",
        "release-owner",
      ],
      evidenceRequirements: [
        {
          requirementId: "pharmacy.current-register",
          kind: "official-register",
          description:
            "Exact pharmacy identity, current Y-number/register result, responsible pharmacist, and dispensing scope.",
        },
        {
          requirementId: "pharmacy.partner-approval",
          kind: "partner-evidence",
          description: "Executed partner role and accountable dispensing approval.",
        },
      ],
      variants: [
        pending({
          variantId: "pharmacy.homepage-licensed-local",
          exactText: "Licensed local pharmacy.",
          sources: [
            {
              path: "src/components/HowItWorks.tsx",
              locator: "courier step body",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; exact pharmacy evidence is pending.",
        }),
      ],
    },
    {
      claimId: "claim.unsuitable-treatment-pricing",
      family: "unsuitable-treatment-pricing",
      accountableOwner: "commercial-owner",
      requiredApprovers: [
        "clinical-owner",
        "commercial-owner",
        "legal-privacy-owner",
        "release-owner",
      ],
      evidenceRequirements: [
        {
          requirementId: "pricing.unsuitable-outcome",
          kind: "commercial-rule",
          description:
            "Approved clinical-rejection trigger, consultation price, exclusions, payment/refund handling, and versioned commercial terms.",
        },
      ],
      variants: [
        pending({
          variantId: "pricing.free-unsuitable-consult",
          exactText: publicContent.homepage.doctor.unsuitable,
          sources: [
            {
              path: "src/components/Doctor.tsx",
              locator: "unsuitable-treatment paragraph",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained at owner direction; pricing and rejection rules are pending.",
        }),
      ],
    },
    {
      claimId: "claim.cancellation",
      family: "cancellation",
      accountableOwner: "commercial-owner",
      requiredApprovers: [
        "commercial-owner",
        "operations-owner",
        "legal-privacy-owner",
        "release-owner",
      ],
      evidenceRequirements: [
        {
          requirementId: "cancellation.digital-route",
          kind: "technical-control",
          description: "Verified digital cancellation route without mandatory telephone contact.",
        },
        {
          requirementId: "cancellation.approved-consequences",
          kind: "commercial-rule",
          description:
            "Approved stage-specific cancellation, fulfilment, subscription, refund, and exception consequences.",
        },
      ],
      variants: [
        pending({
          variantId: "cancellation.homepage-no-call",
          exactText: publicContent.homepage.benefits[3],
          sources: [
            {
              path: "src/components/Benefits.tsx",
              locator: "benefits item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained with DR-002's qualified meaning; route and stage-specific consequences remain pending.",
        }),
      ],
    },
    {
      claimId: "claim.service-timing",
      family: "service-timing",
      accountableOwner: "operations-owner",
      requiredApprovers: [
        "clinical-owner",
        "operations-owner",
        "commercial-owner",
        "release-owner",
      ],
      evidenceRequirements: [
        {
          requirementId: "timing.defined-events",
          kind: "approved-policy",
          description:
            "Defined start/end events, qualifiers, exceptions, and accountable service owner.",
        },
        {
          requirementId: "timing.measured-performance",
          kind: "operational-measurement",
          description: "Current measured performance supporting the exact promise and channel.",
        },
      ],
      variants: [
        pending({
          variantId: "timing.intake-five-minutes",
          exactText: publicContent.homepage.cta.body,
          sources: [
            {
              path: "src/components/CtaSection.tsx",
              locator: "homepage closing proposition",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained only as an initial-intake estimate; measured evidence and approved qualification are pending.",
        }),
        pending({
          variantId: "timing.evenings-weekends",
          exactText: publicContent.homepage.howItWorks.steps[1].body,
          sources: [
            {
              path: "src/components/HowItWorks.tsx",
              locator: "doctor step body",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained only as staffing-dependent availability; staffing and measurement evidence are pending.",
        }),
        rejected({
          variantId: "timing.booked-dosed-48-hours",
          exactText: "Booked & dosed inside 48 hours.",
          sources: [
            {
              path: "src/components/TrustStrip.tsx",
              locator: "timing trust item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Rejected by the approved 7.2 semantics because 48 hours may describe initial contact or review, not guaranteed dosing.",
        }),
        pending({
          variantId: "timing.initial-review-48-hours",
          exactText: publicContent.homepage.trust[3],
          sources: [
            {
              path: "src/components/TrustStrip.tsx",
              locator: "timing trust item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Owner-approved replacement aligned to Task 7.2; operational evidence remains pending.",
        }),
        rejected({
          variantId: "timing.weekend-treatment",
          exactText: "Treatment in the post by the weekend.",
          sources: [
            {
              path: "src/components/CtaSection.tsx",
              locator: "homepage closing proposition",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Rejected because it lacks defined intake, approval, pharmacy, stock, dispatch, delivery, and exception conditions.",
        }),
        pending({
          variantId: "timing.conditional-pharmacy-delivery",
          exactText: publicContent.homepage.cta.body,
          sources: [
            {
              path: "src/components/CtaSection.tsx",
              locator: "homepage closing proposition",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Owner-approved replacement aligned to Task 7.2; fulfilment evidence remains pending.",
        }),
        pending({
          variantId: "timing.contact-within-48-hours",
          exactText: publicContent.journey.confirmationContact,
          sources: [
            {
              path: "src/routes/start.tsx",
              locator: "preserved confirmation",
              channel: "website-route",
            },
          ],
          allowedChannels: ["website-route"],
          dispositionReason:
            "Semantically eligible as a qualified initial-contact target, but staffing and measured evidence remain pending.",
        }),
        rejected({
          variantId: "timing.delivery-two-three-days",
          exactText: "Medication delivered to your door — 2–3 business days",
          sources: [
            {
              path: "src/routes/start.tsx",
              locator: "preserved confirmation timeline",
              channel: "website-route",
            },
          ],
          allowedChannels: ["website-route"],
          dispositionReason:
            "Rejected because the approved provisional target is 3–5 business days from eligibility for fulfilment, subject to evidence and exceptions.",
        }),
        pending({
          variantId: "timing.delivery-three-five-days",
          exactText: publicContent.journey.confirmation[4].when,
          sources: [
            {
              path: "src/routes/start.tsx",
              locator: "preserved confirmation timeline",
              channel: "website-route",
            },
          ],
          allowedChannels: ["website-route"],
          dispositionReason:
            "Owner-approved replacement aligned to Task 7.2; measured fulfilment evidence remains pending.",
        }),
      ],
    },
    {
      claimId: "claim.discreet-fulfilment",
      family: "discreet-fulfilment",
      accountableOwner: "operations-owner",
      requiredApprovers: ["operations-owner", "legal-privacy-owner", "release-owner"],
      evidenceRequirements: [
        {
          requirementId: "fulfilment.packaging-custody",
          kind: "partner-evidence",
          description:
            "Approved packaging, sender label, pharmacy-to-hub custody, courier coverage, proof of delivery, and exception process.",
        },
      ],
      variants: [
        pending({
          variantId: "fulfilment.metadata-discreet-door",
          exactText: "discreetly delivered to your door",
          sources: [
            { path: "src/routes/__root.tsx", locator: "root description", channel: "metadata" },
            { path: "src/routes/index.tsx", locator: "homepage description", channel: "metadata" },
          ],
          allowedChannels: ["metadata"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.truststrip-plain-box",
          exactText: publicContent.homepage.trust[1],
          sources: [
            {
              path: "src/components/TrustStrip.tsx",
              locator: "packaging trust item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.discretion-unmarked",
          exactText: publicContent.homepage.discretion.cards[1].body,
          sources: [
            {
              path: "src/components/Discretion.tsx",
              locator: "boxed-in-beige card",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.hero-door",
          exactText: publicContent.homepage.hero.body,
          sources: [
            {
              path: "src/components/Hero.tsx",
              locator: "hero proposition",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.benefit-beige-door",
          exactText: publicContent.homepage.benefits[2],
          sources: [
            {
              path: "src/components/Benefits.tsx",
              locator: "benefits item",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.how-it-works-beige",
          exactText: publicContent.homepage.howItWorks.steps[2].body,
          sources: [
            {
              path: "src/components/HowItWorks.tsx",
              locator: "courier step body",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
        pending({
          variantId: "fulfilment.poster-discreet",
          exactText: "Discreet delivery",
          sources: [
            { path: "src/routes/poster.tsx", locator: "poster footer", channel: "poster" },
            {
              path: "src/routes/poster-thanks.tsx",
              locator: "poster footer",
              channel: "poster",
            },
          ],
          allowedChannels: ["poster"],
          dispositionReason: "Retained at owner direction; packaging/courier evidence is pending.",
        }),
      ],
    },
    {
      claimId: "claim.peptide-positioning",
      family: "peptide-positioning",
      accountableOwner: "clinical-owner",
      requiredApprovers: [
        "clinical-owner",
        "legal-privacy-owner",
        "operations-owner",
        "release-owner",
      ],
      evidenceRequirements: [
        {
          requirementId: "peptide.product-authority",
          kind: "product-authority",
          description:
            "Exact product, manufacturer, formulation, indication, registration or lawful alternative authority, and supply conditions.",
        },
        {
          requirementId: "peptide.clinical-positioning",
          kind: "clinical-approval",
          description:
            "Product-specific clinical support and approval for every advertised benefit and qualifier.",
        },
        {
          requirementId: "peptide.partner-pathway",
          kind: "partner-evidence",
          description:
            "Approved questionnaire, reviewer/decision-maker, dispensing, data hand-off, exclusions, follow-up, and escalation pathway.",
        },
      ],
      variants: [
        pending({
          variantId: "peptide.treatment-card",
          exactText: publicContent.homepage.treatments.items[4].title,
          sources: [
            {
              path: "src/components/Treatments.tsx",
              locator: "peptides treatment card",
              channel: "website-homepage",
            },
          ],
          allowedChannels: ["website-homepage"],
          dispositionReason:
            "Retained as first-rollout positioning; product/pathway evidence is pending.",
        }),
        pending({
          variantId: "peptide.route-headline",
          exactText: publicContent.peptides.headline,
          sources: [
            {
              path: "src/routes/peptides.tsx",
              locator: "route headline and preview headline",
              channel: "website-route",
            },
          ],
          allowedChannels: ["website-route"],
          dispositionReason:
            "Retained as first-rollout positioning; product/pathway evidence is pending.",
        }),
        pending({
          variantId: "peptide.metadata-benefits",
          exactText: publicContent.metadata.peptides.description,
          sources: [
            {
              path: "src/routes/peptides.tsx",
              locator: "route meta description",
              channel: "metadata",
            },
          ],
          allowedChannels: ["metadata"],
          dispositionReason:
            "Retained at owner direction; product-specific authority and benefit approval are pending.",
        }),
      ],
    },
  ],
});
