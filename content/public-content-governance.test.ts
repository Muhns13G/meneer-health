import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  publicContentCatalogueSchema,
  publicContentRecordSchema,
  selectPublicContent,
  type PublicContentValue,
} from "../contracts/public-content";
import { retainedPublicClaimRegister } from "../contracts/retained-public-claims";
import { canonicalJourneyPhaseIds, publicContentGovernance } from "./public-content-governance";
import { publicContent } from "./public-content";

const sourceFor = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const allRepresentationIds = () => [
  ...Object.values(publicContentGovernance.journey.projections).flatMap((items) =>
    items.map(({ representationId }) => representationId),
  ),
  ...publicContentGovernance.treatments.map(({ contentId }) => contentId),
  ...publicContentGovernance.policies.map(({ contentId }) => contentId),
  ...publicContentGovernance.support.map(({ contentId }) => contentId),
  ...publicContentGovernance.trust.map(({ contentId }) => contentId),
];

const approvedLifecycle = Object.freeze({
  status: "approved" as const,
  effectiveFrom: "2030-01-01T00:00:00Z",
  reviewAt: "2031-01-01T00:00:00Z",
  expiresAt: null,
  approvals: [
    { role: "content-owner" as const, approvedAt: "2029-12-01T00:00:00Z" },
    { role: "release-owner" as const, approvedAt: "2029-12-02T00:00:00Z" },
  ],
  withdrawal: null,
  archive: null,
});

const lifecycleValues: readonly PublicContentValue[] = [
  {
    kind: "journey-projection",
    projectionId: "marketing-three-step",
    title: publicContent.homepage.howItWorks.title,
    summary: publicContent.homepage.howItWorks.steps[0].body,
    phaseIds: ["pathway-and-intake"],
  },
  {
    kind: "treatment",
    treatmentId: "peptides",
    label: publicContent.homepage.treatments.items[4].tag,
    title: publicContent.homepage.treatments.items[4].title,
    description: publicContent.peptides.introduction,
    availability: "pilot-gated",
    destination: "/peptides",
  },
  {
    kind: "policy",
    policyId: "privacy",
    title: publicContent.metadata.privacy.title,
    summary: publicContent.metadata.privacy.description,
    destination: "/privacy",
  },
  {
    kind: "support-route",
    purpose: "general",
    availability: "available",
    label: publicContent.support.general.email,
    destination: publicContent.support.general.href,
    serviceExpectation: publicContent.support.general.monitoring,
  },
  {
    kind: "trust-marker",
    claimId: "claim.service-timing",
    text: publicContent.homepage.trust[3],
  },
];

function revision(
  value: PublicContentValue,
  revisionNumber: number,
  lifecycle: Record<string, unknown>,
) {
  return {
    revision: revisionNumber,
    supersedesRevision: revisionNumber === 1 ? null : revisionNumber - 1,
    kind: value.kind,
    accountableOwner: "content-owner",
    requiredApprovers: ["content-owner", "release-owner"],
    channels: ["website-route"],
    localisations: [{ locale: "en-ZA", value }],
    lifecycle,
  };
}

describe("public-content cross-channel governance", () => {
  it("versions the runtime source and rejects duplicate governed identifiers", () => {
    expect(publicContent.schemaVersion).toBe(1);
    expect(publicContentGovernance).toMatchObject({
      contract: "public-content.runtime-map",
      version: 1,
      sourceVersion: "2026.08.13.1",
      defaultLocale: "en-ZA",
    });

    const ids = allRepresentationIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(publicContentGovernance.migratedConsumers).size).toBe(
      publicContentGovernance.migratedConsumers.length,
    );
  });

  it("keeps every journey projection ordered against the five canonical phases", () => {
    expect(publicContentGovernance.journey.phaseIds).toEqual(canonicalJourneyPhaseIds);
    const positions = new Map(canonicalJourneyPhaseIds.map((phaseId, index) => [phaseId, index]));

    for (const representations of Object.values(publicContentGovernance.journey.projections)) {
      for (const representation of representations) {
        const phasePositions = representation.phaseIds.map((phaseId) => positions.get(phaseId));
        expect(phasePositions, representation.representationId).not.toContain(undefined);
        expect(phasePositions, representation.representationId).toEqual(
          [...phasePositions].sort((left, right) => (left ?? 0) - (right ?? 0)),
        );
      }
    }

    expect(
      new Set(
        publicContentGovernance.journey.projections.marketingThreeStep.flatMap(
          ({ phaseIds }) => phaseIds,
        ),
      ),
    ).toEqual(new Set(canonicalJourneyPhaseIds));
    expect(
      publicContentGovernance.journey.projections.journeyFourEvent.map(({ phaseIds }) => phaseIds),
    ).toEqual([
      ["pathway-and-intake"],
      ["screening-and-review", "consultation-and-decision"],
      ["consultation-and-decision", "pharmacy-and-delivery"],
      ["pharmacy-and-delivery"],
    ]);
    expect(
      publicContentGovernance.journey.projections.detailedConfirmation.map(
        ({ phaseIds }) => phaseIds,
      ),
    ).toEqual([
      ["screening-and-review"],
      ["screening-and-review"],
      ["consultation-and-decision"],
      ["consultation-and-decision"],
      ["price-and-payment", "pharmacy-and-delivery"],
    ]);
  });

  it("keeps treatment, policy and support projections attached to their source channels", () => {
    expect(publicContentGovernance.treatments.map(({ value }) => value)).toEqual(
      publicContent.homepage.treatments.items,
    );
    expect(publicContentGovernance.treatments.map(({ navigation }) => navigation)).toEqual(
      publicContent.navigation.primary.slice(0, 5),
    );
    expect(publicContentGovernance.policies.map(({ navigation }) => navigation)).toEqual(
      publicContent.navigation.footer.slice(0, 2),
    );
    expect(publicContentGovernance.policies.map(({ metadata }) => metadata)).toEqual([
      publicContent.metadata.privacy,
      publicContent.metadata.terms,
    ]);
    expect(publicContentGovernance.support[0]?.value).toBe(publicContent.support.general);
    expect(publicContentGovernance.support[1]?.value).toBe(publicContent.support.emergency.mobile);
    expect(publicContentGovernance.support[2]?.value).toBe(
      publicContent.support.emergency.ambulance,
    );
  });

  it("binds every trust projection and retained claim source to the canonical runtime source", () => {
    for (const trust of publicContentGovernance.trust) {
      const variant = retainedPublicClaimRegister.claims
        .find(({ claimId }) => claimId === trust.claimId)
        ?.variants.find(({ variantId }) => variantId === trust.variantId);
      expect(variant, trust.contentId).toMatchObject({ exactText: trust.value });
    }

    const claimSourcePaths = new Set(
      retainedPublicClaimRegister.claims.flatMap(({ variants }) =>
        variants.flatMap(({ sources }) => sources.map(({ path }) => path)),
      ),
    );
    for (const path of claimSourcePaths) {
      expect(sourceFor(path), path).toContain("@content/public-content");
    }

    const canonicalText = JSON.stringify(publicContent);
    for (const claim of retainedPublicClaimRegister.claims) {
      for (const variant of claim.variants) {
        if (variant.status !== "rejected") {
          expect(canonicalText, `${claim.claimId}/${variant.variantId}`).toContain(
            variant.exactText,
          );
        }
      }
    }
  });

  it.each(lifecycleValues)(
    "fails $kind content closed on expiry or withdrawal and rolls back only to an eligible revision",
    (value) => {
      const draftLifecycle = {
        status: "draft",
        effectiveFrom: null,
        reviewAt: null,
        expiresAt: null,
        approvals: [],
        withdrawal: null,
        archive: null,
      };
      const history = [revision(value, 1, approvedLifecycle), revision(value, 2, draftLifecycle)];
      const rollback = publicContentRecordSchema.parse({
        contentId: `synthetic.${value.kind}`,
        selectedRevision: 1,
        revisions: history,
      });
      const context = {
        channel: "website-route" as const,
        locale: "en-ZA",
        at: "2030-06-01T00:00:00Z",
      };

      expect(selectPublicContent(rollback, context)).toMatchObject({ revision: 1, value });
      expect(
        selectPublicContent(
          publicContentRecordSchema.parse({ ...rollback, selectedRevision: 2 }),
          context,
        ),
      ).toBeUndefined();

      const expired = publicContentRecordSchema.parse({
        contentId: `synthetic.${value.kind}`,
        selectedRevision: 1,
        revisions: [
          revision(value, 1, { ...approvedLifecycle, expiresAt: "2030-05-01T00:00:00Z" }),
        ],
      });
      expect(selectPublicContent(expired, context)).toBeUndefined();

      const withdrawn = publicContentRecordSchema.parse({
        contentId: `synthetic.${value.kind}`,
        selectedRevision: 1,
        revisions: [
          revision(value, 1, {
            ...approvedLifecycle,
            status: "withdrawn",
            withdrawal: {
              kind: "emergency",
              reason: "release-error",
              withdrawnAt: "2030-05-01T00:00:00Z",
              withdrawnBy: "release-owner",
              replacementContentId: null,
            },
          }),
        ],
      });
      expect(selectPublicContent(withdrawn, context)).toBeUndefined();
    },
  );

  it("rejects duplicate catalogue records and invalid revision histories", () => {
    const value = lifecycleValues[0]!;
    const valid = publicContentRecordSchema.parse({
      contentId: "synthetic.duplicate",
      selectedRevision: 1,
      revisions: [revision(value, 1, approvedLifecycle)],
    });
    expect(
      publicContentCatalogueSchema.safeParse({
        contract: "public-content.catalogue",
        version: 1,
        catalogueVersion: "2030.01.01.1",
        generatedAt: "2030-01-01T00:00:00Z",
        defaultLocale: "en-ZA",
        records: [valid, valid],
      }).success,
    ).toBe(false);
    expect(
      publicContentRecordSchema.safeParse({
        ...valid,
        selectedRevision: 3,
        revisions: [revision(value, 1, approvedLifecycle), revision(value, 3, approvedLifecycle)],
      }).success,
    ).toBe(false);
  });
});
