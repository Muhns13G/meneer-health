import { describe, expect, it } from "vitest";

import { contractDefinitionSchema } from "./catalogue";
import {
  publicContentCatalogueContract,
  publicContentCatalogueSchema,
  publicContentRecordSchema,
  publicContentValueSchema,
  selectPublicContent,
  type PublicContentRecord,
} from "./public-content";

const approvedLifecycle = {
  status: "approved",
  effectiveFrom: "2030-01-01T00:00:00Z",
  reviewAt: "2031-01-01T00:00:00Z",
  expiresAt: null,
  approvals: [
    { role: "content-owner", approvedAt: "2029-12-01T00:00:00Z" },
    { role: "release-owner", approvedAt: "2029-12-02T00:00:00Z" },
  ],
  withdrawal: null,
  archive: null,
} as const;

const journeyValue = {
  kind: "journey-phase",
  phaseId: "pathway-and-intake",
  position: 1,
  title: "Synthetic pathway and intake",
  summary: "Synthetic public-content contract fixture.",
  conditional: false,
} as const;

function revision(
  number = 1,
  lifecycle: Record<string, unknown> = approvedLifecycle,
  value: Record<string, unknown> = journeyValue,
) {
  return {
    revision: number,
    supersedesRevision: number === 1 ? null : number - 1,
    kind: value.kind,
    accountableOwner: "content-owner",
    requiredApprovers: ["content-owner", "release-owner"],
    channels: ["website-route", "metadata"],
    localisations: [{ locale: "en-ZA", value }],
    lifecycle,
  };
}

function record(overrides: Record<string, unknown> = {}): PublicContentRecord {
  return publicContentRecordSchema.parse({
    contentId: "journey.pathway-and-intake",
    selectedRevision: 1,
    revisions: [revision()],
    ...overrides,
  });
}

describe("public-content catalogue contract", () => {
  it("is framework-neutral, versioned and registered as public content", () => {
    expect(contractDefinitionSchema.parse(publicContentCatalogueContract)).toEqual(
      publicContentCatalogueContract,
    );
    expect(publicContentCatalogueContract).toMatchObject({
      name: "public-content.catalogue",
      kind: "content-catalogue",
      version: 1,
      sensitivity: "public",
    });
  });

  it("accepts an approved catalogue and selects only the eligible channel and locale", () => {
    const catalogue = publicContentCatalogueSchema.parse({
      contract: "public-content.catalogue",
      version: 1,
      catalogueVersion: "2030.01.01.1",
      generatedAt: "2030-01-01T00:00:00Z",
      defaultLocale: "en-ZA",
      records: [record()],
    });

    expect(
      selectPublicContent(catalogue.records[0]!, {
        channel: "website-route",
        locale: "en-ZA",
        at: "2030-06-01T00:00:00Z",
      }),
    ).toEqual({
      contentId: "journey.pathway-and-intake",
      revision: 1,
      locale: "en-ZA",
      value: journeyValue,
    });
    expect(
      selectPublicContent(catalogue.records[0]!, {
        channel: "poster",
        locale: "en-ZA",
        at: "2030-06-01T00:00:00Z",
      }),
    ).toBeUndefined();
    expect(
      selectPublicContent(catalogue.records[0]!, {
        channel: "website-route",
        locale: "af-ZA",
        at: "2030-06-01T00:00:00Z",
      }),
    ).toBeUndefined();
  });

  it("fails closed before effectiveness and at review or expiry", () => {
    const content = record();
    const context = { channel: "website-route", locale: "en-ZA" } as const;

    expect(
      selectPublicContent(content, { ...context, at: "2029-12-31T23:59:59Z" }),
    ).toBeUndefined();
    expect(
      selectPublicContent(content, { ...context, at: "2031-01-01T00:00:00Z" }),
    ).toBeUndefined();

    const expiring = record({
      revisions: [revision(1, { ...approvedLifecycle, expiresAt: "2030-07-01T00:00:00Z" })],
    });
    expect(
      selectPublicContent(expiring, { ...context, at: "2030-07-01T00:00:00Z" }),
    ).toBeUndefined();
  });

  it("rejects approval without every required role and invalid lifecycle ordering", () => {
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 1,
        revisions: [
          revision(1, {
            ...approvedLifecycle,
            approvals: [approvedLifecycle.approvals[0]],
          }),
        ],
      }).success,
    ).toBe(false);
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 1,
        revisions: [
          revision(1, {
            ...approvedLifecycle,
            approvals: [
              approvedLifecycle.approvals[0],
              { role: "release-owner", approvedAt: "2030-01-02T00:00:00Z" },
            ],
          }),
        ],
      }).success,
    ).toBe(false);
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 1,
        revisions: [
          revision(1, {
            ...approvedLifecycle,
            reviewAt: "2029-12-31T00:00:00Z",
          }),
        ],
      }).success,
    ).toBe(false);
  });

  it("requires evidence for emergency withdrawal and archive states", () => {
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 1,
        revisions: [revision(1, { ...approvedLifecycle, status: "withdrawn" })],
      }).success,
    ).toBe(false);
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 1,
        revisions: [revision(1, { ...approvedLifecycle, status: "archived" })],
      }).success,
    ).toBe(false);

    const withdrawn = record({
      revisions: [
        revision(1, {
          ...approvedLifecycle,
          status: "withdrawn",
          withdrawal: {
            kind: "emergency",
            reason: "clinical-safety",
            withdrawnAt: "2030-06-01T00:00:00Z",
            withdrawnBy: "clinical-owner",
            replacementContentId: null,
          },
        }),
      ],
    });
    expect(
      selectPublicContent(withdrawn, {
        channel: "website-route",
        locale: "en-ZA",
        at: "2030-06-02T00:00:00Z",
      }),
    ).toBeUndefined();
  });

  it("supports draft-forward history and rollback only to an eligible approved revision", () => {
    const draftLifecycle = {
      status: "draft",
      effectiveFrom: null,
      reviewAt: null,
      expiresAt: null,
      approvals: [],
      withdrawal: null,
      archive: null,
    } as const;
    const history = [revision(), revision(2, draftLifecycle)];
    const approvedSelection = record({ selectedRevision: 1, revisions: history });
    const draftSelection = record({ selectedRevision: 2, revisions: history });
    const context = {
      channel: "website-route",
      locale: "en-ZA",
      at: "2030-06-01T00:00:00Z",
    } as const;

    expect(selectPublicContent(approvedSelection, context)?.revision).toBe(1);
    expect(selectPublicContent(draftSelection, context)).toBeUndefined();
    expect(
      publicContentRecordSchema.safeParse({
        contentId: "journey.pathway-and-intake",
        selectedRevision: 3,
        revisions: history,
      }).success,
    ).toBe(false);
  });

  it("covers every governed public-content kind with strict portable values", () => {
    const values = [
      {
        kind: "treatment",
        treatmentId: "synthetic-treatment",
        label: "Synthetic treatment",
        title: "Synthetic treatment title",
        description: "Synthetic description.",
        availability: "pilot-gated",
        destination: "/synthetic",
      },
      journeyValue,
      {
        kind: "journey-projection",
        projectionId: "marketing-three-step",
        title: "Synthetic summary",
        summary: "Synthetic projection.",
        phaseIds: ["pathway-and-intake", "consultation-and-decision", "pharmacy-and-delivery"],
      },
      {
        kind: "support-route",
        purpose: "general",
        availability: "available",
        label: "Synthetic support",
        destination: "mailto:synthetic@example.invalid",
        serviceExpectation: "Synthetic service expectation.",
      },
      {
        kind: "pricing-state",
        scenario: "consultation-only",
        publicationState: "unpublished",
        currency: "ZAR",
        priceVersion: null,
        amountMinor: null,
        summary: "Synthetic unpublished price.",
      },
      {
        kind: "policy",
        policyId: "synthetic-policy",
        title: "Synthetic policy",
        summary: "Synthetic policy summary.",
        destination: "/synthetic-policy",
      },
      { kind: "trust-marker", claimId: "synthetic-claim", text: "Synthetic trust marker." },
      {
        kind: "metadata",
        routePath: "/synthetic",
        title: "Synthetic metadata",
        description: "Synthetic metadata description.",
      },
      {
        kind: "campaign-message",
        campaignId: "synthetic-campaign",
        headline: "Synthetic campaign",
        body: "Synthetic campaign body.",
      },
    ];

    for (const value of values)
      expect(publicContentValueSchema.safeParse(value).success).toBe(true);
    expect(
      publicContentValueSchema.safeParse({ ...journeyValue, component: "ReactComponent" }).success,
    ).toBe(false);
    expect(
      publicContentValueSchema.safeParse({
        kind: "pricing-state",
        scenario: "consultation-only",
        publicationState: "unpublished",
        currency: "ZAR",
        priceVersion: "synthetic-price-v1",
        amountMinor: null,
        summary: "Partial pricing must fail.",
      }).success,
    ).toBe(false);
  });

  it("requires every selected revision to carry the catalogue default locale", () => {
    const selected = record();
    const localised = {
      ...selected,
      revisions: [
        {
          ...selected.revisions[0]!,
          localisations: [{ locale: "af-ZA", value: journeyValue }],
        },
      ],
    };
    expect(
      publicContentCatalogueSchema.safeParse({
        contract: "public-content.catalogue",
        version: 1,
        catalogueVersion: "2030.01.01.1",
        generatedAt: "2030-01-01T00:00:00Z",
        defaultLocale: "en-ZA",
        records: [localised],
      }).success,
    ).toBe(false);
  });
});
