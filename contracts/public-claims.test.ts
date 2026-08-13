import { describe, expect, it } from "vitest";

import { contractDefinitionSchema } from "./catalogue";
import {
  assessClaimBearingContentPublication,
  assessPublicClaimPublication,
  publicClaimRecordSchema,
  publicClaimRegisterContract,
  publicClaimRegisterSchema,
  type PublicClaimRegister,
} from "./public-claims";
import { publicContentRecordSchema } from "./public-content";
import { retainedPublicClaimRegister } from "./retained-public-claims";

const verifiedEvidence = [
  {
    requirementId: "synthetic.claim-source",
    reference: "docs/synthetic-evidence.invalid",
    verifiedAt: "2029-12-01T00:00:00Z",
    validUntil: "2030-09-01T00:00:00Z",
    verifiedBy: "clinical-owner",
  },
] as const;

function approvedRegister(
  overrides: Record<string, unknown> = {},
  claimOverrides: Record<string, unknown> = {},
): PublicClaimRegister {
  return publicClaimRegisterSchema.parse({
    contract: "public-claims.register",
    version: 1,
    registerVersion: "2030.01.01.1",
    generatedAt: "2030-01-01T00:00:00Z",
    claims: [
      {
        claimId: "claim.synthetic",
        family: "practitioner-registration",
        accountableOwner: "clinical-owner",
        requiredApprovers: ["clinical-owner", "release-owner"],
        evidenceRequirements: [
          {
            requirementId: "synthetic.claim-source",
            kind: "clinical-approval",
            description: "Synthetic evidence requirement.",
          },
        ],
        variants: [
          {
            variantId: "synthetic.approved",
            exactText: "Synthetic approved public claim.",
            sources: [
              {
                path: "src/components/Synthetic.tsx",
                locator: "synthetic fixture",
                channel: "website-homepage",
              },
            ],
            allowedChannels: ["website-homepage", "metadata"],
            audiences: ["public"],
            status: "approved",
            ownerDirection: "retain",
            effectiveFrom: "2030-01-01T00:00:00Z",
            reviewAt: "2031-01-01T00:00:00Z",
            expiresAt: null,
            approvals: [
              { role: "clinical-owner", approvedAt: "2029-12-01T00:00:00Z" },
              { role: "release-owner", approvedAt: "2029-12-02T00:00:00Z" },
            ],
            evidence: verifiedEvidence,
            withdrawal: null,
            archive: null,
            dispositionReason: "Synthetic approved fixture.",
            ...overrides,
          },
        ],
        ...claimOverrides,
      },
    ],
  });
}

const approvedContent = publicContentRecordSchema.parse({
  contentId: "content.synthetic",
  selectedRevision: 1,
  revisions: [
    {
      revision: 1,
      supersedesRevision: null,
      kind: "trust-marker",
      accountableOwner: "content-owner",
      requiredApprovers: ["content-owner", "release-owner"],
      channels: ["website-homepage"],
      localisations: [
        {
          locale: "en-ZA",
          value: {
            kind: "trust-marker",
            claimId: "claim.synthetic",
            text: "Synthetic approved public claim.",
          },
        },
      ],
      lifecycle: {
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
      },
    },
  ],
});

describe("public claim register", () => {
  it("is a framework-neutral registered contract", () => {
    expect(contractDefinitionSchema.parse(publicClaimRegisterContract)).toEqual(
      publicClaimRegisterContract,
    );
    expect(publicClaimRegisterContract).toMatchObject({
      name: "public-claims.register",
      kind: "content-catalogue",
      version: 1,
      sensitivity: "public",
    });
  });

  it("completes the nine retained families without inventing domain evidence", () => {
    expect(publicClaimRegisterSchema.parse(retainedPublicClaimRegister)).toEqual(
      retainedPublicClaimRegister,
    );
    expect(retainedPublicClaimRegister.claims).toHaveLength(9);
    expect(retainedPublicClaimRegister.claims.map(({ family }) => family)).toEqual([
      "practitioner-registration",
      "privacy-compliance",
      "encryption-and-sharing",
      "pharmacy-licensing",
      "unsuitable-treatment-pricing",
      "cancellation",
      "service-timing",
      "discreet-fulfilment",
      "peptide-positioning",
    ]);
    const variants = retainedPublicClaimRegister.claims.flatMap(({ variants }) => variants);
    expect(variants).toHaveLength(31);
    expect(variants.filter(({ status }) => status === "pending-evidence")).toHaveLength(28);
    expect(variants.filter(({ status }) => status === "rejected")).toHaveLength(3);
    expect(variants).not.toContainEqual(expect.objectContaining({ status: "approved" }));
  });

  it("records the nonconforming timing variants as rejected and replace-only", () => {
    const timing = retainedPublicClaimRegister.claims.find(
      ({ claimId }) => claimId === "claim.service-timing",
    );
    const rejectedVariants = timing?.variants.filter(({ status }) => status === "rejected");

    expect(rejectedVariants?.map(({ variantId }) => variantId)).toEqual([
      "timing.booked-dosed-48-hours",
      "timing.weekend-treatment",
      "timing.delivery-two-three-days",
    ]);
    expect(rejectedVariants?.every(({ ownerDirection }) => ownerDirection === "replace")).toBe(
      true,
    );
  });

  it("fails closed for every retained claim until evidence and approvals are complete", () => {
    for (const claim of retainedPublicClaimRegister.claims) {
      for (const variant of claim.variants) {
        expect(
          assessPublicClaimPublication(retainedPublicClaimRegister, {
            claimId: claim.claimId,
            variantId: variant.variantId,
            channel: variant.allowedChannels[0]!,
            audience: variant.audiences[0]!,
            at: "2030-01-01T00:00:00Z",
          }),
        ).toEqual({ allowed: false, reason: "STATUS_INELIGIBLE" });
      }
    }
  });

  it("rejects an approved claim record with missing evidence or approvals", () => {
    const validClaim = approvedRegister().claims[0]!;
    const variant = validClaim.variants[0]!;

    expect(
      publicClaimRecordSchema.safeParse({
        ...validClaim,
        variants: [{ ...variant, evidence: [] }],
      }).success,
    ).toBe(false);
    expect(
      publicClaimRecordSchema.safeParse({
        ...validClaim,
        variants: [{ ...variant, approvals: [variant.approvals[0]] }],
      }).success,
    ).toBe(false);
  });

  it("publishes only an approved, evidenced, in-date variant for its channel and audience", () => {
    const register = approvedRegister();
    const request = {
      claimId: "claim.synthetic",
      variantId: "synthetic.approved",
      channel: "website-homepage",
      audience: "public",
      at: "2030-06-01T00:00:00Z",
    } as const;

    expect(assessPublicClaimPublication(register, request)).toEqual({
      allowed: true,
      claimId: "claim.synthetic",
      variantId: "synthetic.approved",
      exactText: "Synthetic approved public claim.",
    });
    expect(assessPublicClaimPublication(register, { ...request, channel: "poster" })).toEqual({
      allowed: false,
      reason: "CHANNEL_INELIGIBLE",
    });
    expect(
      assessPublicClaimPublication(register, { ...request, audience: "pilot-participant" }),
    ).toEqual({ allowed: false, reason: "AUDIENCE_INELIGIBLE" });
    expect(
      assessPublicClaimPublication(register, { ...request, at: "2029-12-31T23:59:59Z" }),
    ).toEqual({ allowed: false, reason: "NOT_EFFECTIVE" });
    expect(
      assessPublicClaimPublication(register, { ...request, at: "2031-01-01T00:00:00Z" }),
    ).toEqual({ allowed: false, reason: "REVIEW_DUE" });
  });

  it("fails closed when claim evidence has expired", () => {
    const register = approvedRegister();
    expect(
      assessPublicClaimPublication(register, {
        claimId: "claim.synthetic",
        variantId: "synthetic.approved",
        channel: "website-homepage",
        audience: "public",
        at: "2030-09-01T00:00:00Z",
      }),
    ).toEqual({ allowed: false, reason: "EVIDENCE_EXPIRED" });
  });

  it("requires claim references before claim-bearing content can publish", () => {
    const context = {
      channel: "website-homepage",
      locale: "en-ZA",
      at: "2030-06-01T00:00:00Z",
    } as const;
    const register = approvedRegister();

    expect(
      assessClaimBearingContentPublication({
        record: approvedContent,
        context,
        claimRegister: register,
        claimReferences: [],
        audience: "public",
      }),
    ).toEqual({
      allowed: false,
      reason: "CLAIM_INELIGIBLE",
      claimReason: "CLAIM_NOT_FOUND",
    });
    expect(
      assessClaimBearingContentPublication({
        record: approvedContent,
        context,
        claimRegister: register,
        claimReferences: [
          {
            claimId: "claim.synthetic",
            variantId: "synthetic.approved",
            exactText: "Synthetic approved public claim.",
          },
        ],
        audience: "public",
      }),
    ).toEqual({
      allowed: true,
      content: expect.objectContaining({ contentId: "content.synthetic", revision: 1 }),
    });
    expect(
      assessClaimBearingContentPublication({
        record: approvedContent,
        context,
        claimRegister: register,
        claimReferences: [
          {
            claimId: "claim.synthetic",
            variantId: "synthetic.approved",
            exactText: "A different unapproved claim.",
          },
        ],
        audience: "public",
      }),
    ).toEqual({
      allowed: false,
      reason: "CLAIM_INELIGIBLE",
      claimReason: "TEXT_MISMATCH",
    });
  });
});
