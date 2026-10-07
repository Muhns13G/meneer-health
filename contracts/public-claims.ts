import { z } from "zod";

import { contractDefinitionSchema } from "./catalogue";
import {
  publicContentChannelSchema,
  publicContentIdSchema,
  publicContentOwnerRoleSchema,
  publicContentRecordSchema,
  publicContentSelectionContextSchema,
  selectPublicContent,
  type PublicContentRecord,
  type PublicContentSelectionContext,
  type SelectedPublicContent,
} from "./public-content";
import { rfc3339TimestampSchema } from "./shared";

export const publicClaimRegisterContractName = "public-claims.register" as const;
export const publicClaimRegisterContractVersion = 1 as const;

export const publicClaimRegisterContract = contractDefinitionSchema.parse({
  name: publicClaimRegisterContractName,
  kind: "content-catalogue",
  owner: "Public claim governance module",
  consumers: ["Public content publication boundary", "future approved public channels"],
  version: publicClaimRegisterContractVersion,
  sensitivity: "public",
  idempotency: "not-applicable",
  lifecycle: "active",
});

export const publicClaimFamilySchema = z.enum([
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

export const publicClaimAudienceSchema = z.enum([
  "public",
  "pilot-participant",
  "support-requester",
]);

export const publicClaimLifecycleStatusSchema = z.enum([
  "pending-evidence",
  "approved",
  "rejected",
  "withdrawn",
  "archived",
]);

export const publicClaimEvidenceKindSchema = z.enum([
  "official-register",
  "approved-policy",
  "technical-control",
  "partner-evidence",
  "commercial-rule",
  "operational-measurement",
  "product-authority",
  "clinical-approval",
]);

const sourcePathSchema = z.string().regex(/^(src|docs)\/[A-Za-z0-9_./-]+$/);

const claimEvidenceRequirementSchema = z
  .object({
    requirementId: publicContentIdSchema,
    kind: publicClaimEvidenceKindSchema,
    description: z.string().trim().min(1).max(500),
  })
  .strict();

const claimEvidenceSchema = z
  .object({
    requirementId: publicContentIdSchema,
    reference: z.string().trim().min(1).max(500),
    verifiedAt: rfc3339TimestampSchema,
    validUntil: rfc3339TimestampSchema.nullable(),
    verifiedBy: publicContentOwnerRoleSchema,
  })
  .strict()
  .superRefine((evidence, context) => {
    if (evidence.validUntil && Date.parse(evidence.validUntil) <= Date.parse(evidence.verifiedAt)) {
      context.addIssue({ code: "custom", message: "Evidence validity must follow verification." });
    }
  });

const claimApprovalSchema = z
  .object({
    role: publicContentOwnerRoleSchema,
    approvedAt: rfc3339TimestampSchema,
  })
  .strict();

const claimSourceSchema = z
  .object({
    path: sourcePathSchema,
    locator: z.string().trim().min(1).max(200),
    channel: publicContentChannelSchema,
  })
  .strict();

const claimWithdrawalSchema = z
  .object({
    reason: z.enum([
      "evidence-invalid",
      "clinical-safety",
      "legal-privacy",
      "commercial-operational",
      "release-error",
    ]),
    withdrawnAt: rfc3339TimestampSchema,
    withdrawnBy: publicContentOwnerRoleSchema,
  })
  .strict();

const claimArchiveSchema = z
  .object({
    reason: z.enum(["superseded", "retired", "duplicate", "channel-closed"]),
    archivedAt: rfc3339TimestampSchema,
    archivedBy: publicContentOwnerRoleSchema,
  })
  .strict();

export const publicClaimVariantSchema = z
  .object({
    variantId: publicContentIdSchema,
    exactText: z.string().trim().min(1).max(2_000),
    sources: z.array(claimSourceSchema).min(1),
    allowedChannels: z.array(publicContentChannelSchema).min(1),
    audiences: z.array(publicClaimAudienceSchema).min(1),
    status: publicClaimLifecycleStatusSchema,
    ownerDirection: z.enum(["retain", "replace", "remove"]),
    effectiveFrom: rfc3339TimestampSchema.nullable(),
    reviewAt: rfc3339TimestampSchema.nullable(),
    expiresAt: rfc3339TimestampSchema.nullable(),
    approvals: z.array(claimApprovalSchema),
    evidence: z.array(claimEvidenceSchema),
    withdrawal: claimWithdrawalSchema.nullable(),
    archive: claimArchiveSchema.nullable(),
    dispositionReason: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((variant, context) => {
    const unique = (values: readonly string[]) => new Set(values).size === values.length;
    if (!unique(variant.allowedChannels)) {
      context.addIssue({ code: "custom", message: "Allowed claim channels must be unique." });
    }
    if (!unique(variant.audiences)) {
      context.addIssue({ code: "custom", message: "Claim audiences must be unique." });
    }
    if (!unique(variant.approvals.map(({ role }) => role))) {
      context.addIssue({ code: "custom", message: "Claim approval roles must be unique." });
    }
    if (!unique(variant.evidence.map(({ requirementId }) => requirementId))) {
      context.addIssue({ code: "custom", message: "Claim evidence references must be unique." });
    }
    if (variant.sources.some(({ channel }) => !variant.allowedChannels.includes(channel))) {
      context.addIssue({
        code: "custom",
        message: "Every observed source channel must be declared as an allowed channel.",
      });
    }
    if (variant.status === "approved") {
      if (!variant.effectiveFrom || !variant.reviewAt) {
        context.addIssue({
          code: "custom",
          message: "Approved claims require effective and review timestamps.",
        });
      }
      if (variant.ownerDirection !== "retain") {
        context.addIssue({
          code: "custom",
          message: "Only retained claim variants may be approved.",
        });
      }
      if (variant.withdrawal || variant.archive) {
        context.addIssue({
          code: "custom",
          message: "Approved claims cannot also be withdrawn or archived.",
        });
      }
    } else if (variant.effectiveFrom || variant.reviewAt || variant.expiresAt) {
      context.addIssue({
        code: "custom",
        message: "Only approved claims may carry publication timing.",
      });
    }
    if (variant.status === "rejected" && variant.ownerDirection === "retain") {
      context.addIssue({
        code: "custom",
        message: "Rejected claims must be replaced or removed.",
      });
    }
    if (variant.status === "withdrawn" && !variant.withdrawal) {
      context.addIssue({
        code: "custom",
        message: "Withdrawn claims require withdrawal evidence.",
      });
    }
    if (variant.status !== "withdrawn" && variant.withdrawal) {
      context.addIssue({
        code: "custom",
        message: "Withdrawal evidence requires withdrawn status.",
      });
    }
    if (variant.status === "archived" && !variant.archive) {
      context.addIssue({ code: "custom", message: "Archived claims require archive evidence." });
    }
    if (variant.status !== "archived" && variant.archive) {
      context.addIssue({ code: "custom", message: "Archive evidence requires archived status." });
    }
    if (variant.effectiveFrom && variant.reviewAt) {
      if (Date.parse(variant.reviewAt) <= Date.parse(variant.effectiveFrom)) {
        context.addIssue({ code: "custom", message: "Claim review must follow effectiveness." });
      }
    }
    if (variant.effectiveFrom && variant.expiresAt) {
      if (Date.parse(variant.expiresAt) <= Date.parse(variant.effectiveFrom)) {
        context.addIssue({ code: "custom", message: "Claim expiry must follow effectiveness." });
      }
    }
    if (variant.status === "approved" && variant.effectiveFrom) {
      const effectiveAt = Date.parse(variant.effectiveFrom);
      if (variant.approvals.some(({ approvedAt }) => Date.parse(approvedAt) > effectiveAt)) {
        context.addIssue({
          code: "custom",
          message: "Claim approvals must precede or match effectiveness.",
        });
      }
      if (variant.evidence.some(({ verifiedAt }) => Date.parse(verifiedAt) > effectiveAt)) {
        context.addIssue({
          code: "custom",
          message: "Claim evidence must be verified before or at effectiveness.",
        });
      }
    }
  });

export const publicClaimRecordSchema = z
  .object({
    claimId: publicContentIdSchema,
    family: publicClaimFamilySchema,
    accountableOwner: publicContentOwnerRoleSchema,
    requiredApprovers: z.array(publicContentOwnerRoleSchema).min(1),
    evidenceRequirements: z.array(claimEvidenceRequirementSchema).min(1),
    variants: z.array(publicClaimVariantSchema).min(1),
  })
  .strict()
  .superRefine((claim, context) => {
    const unique = (values: readonly string[]) => new Set(values).size === values.length;
    if (!unique(claim.requiredApprovers)) {
      context.addIssue({ code: "custom", message: "Required claim approvers must be unique." });
    }
    const requirementIds = claim.evidenceRequirements.map(({ requirementId }) => requirementId);
    if (!unique(requirementIds)) {
      context.addIssue({ code: "custom", message: "Evidence requirements must be unique." });
    }
    const variantIds = claim.variants.map(({ variantId }) => variantId);
    if (!unique(variantIds)) {
      context.addIssue({ code: "custom", message: "Claim variant identifiers must be unique." });
    }
    const knownRequirements = new Set(requirementIds);
    for (const variant of claim.variants) {
      if (variant.evidence.some(({ requirementId }) => !knownRequirements.has(requirementId))) {
        context.addIssue({
          code: "custom",
          message: `Claim ${claim.claimId} contains evidence for an unknown requirement.`,
        });
      }
      if (variant.status !== "approved") continue;
      const approvedRoles = new Set(variant.approvals.map(({ role }) => role));
      const evidencedRequirements = new Set(
        variant.evidence.map(({ requirementId }) => requirementId),
      );
      for (const role of claim.requiredApprovers) {
        if (!approvedRoles.has(role)) {
          context.addIssue({
            code: "custom",
            message: `Approved claim ${claim.claimId} is missing approval from ${role}.`,
          });
        }
      }
      for (const requirementId of requirementIds) {
        if (!evidencedRequirements.has(requirementId)) {
          context.addIssue({
            code: "custom",
            message: `Approved claim ${claim.claimId} is missing evidence ${requirementId}.`,
          });
        }
      }
    }
  });

export const publicClaimRegisterSchema = z
  .object({
    contract: z.literal(publicClaimRegisterContractName),
    version: z.literal(publicClaimRegisterContractVersion),
    registerVersion: z.string().regex(/^\d{4}\.\d{2}\.\d{2}\.\d+$/),
    generatedAt: rfc3339TimestampSchema,
    claims: z.array(publicClaimRecordSchema).min(1),
  })
  .strict()
  .superRefine((register, context) => {
    const claimIds = register.claims.map(({ claimId }) => claimId);
    if (new Set(claimIds).size !== claimIds.length) {
      context.addIssue({ code: "custom", message: "Public claim identifiers must be unique." });
    }
  });

export const publicClaimPublicationRequestSchema = z
  .object({
    claimId: publicContentIdSchema,
    variantId: publicContentIdSchema,
    channel: publicContentChannelSchema,
    audience: publicClaimAudienceSchema,
    at: rfc3339TimestampSchema,
  })
  .strict();

export const publicClaimReferenceSchema = z
  .object({
    claimId: publicContentIdSchema,
    variantId: publicContentIdSchema,
    exactText: z.string().trim().min(1).max(2_000),
  })
  .strict();

export type PublicClaimRegister = z.infer<typeof publicClaimRegisterSchema>;
export type PublicClaimPublicationRequest = z.infer<typeof publicClaimPublicationRequestSchema>;
export type PublicClaimReference = z.infer<typeof publicClaimReferenceSchema>;

export type PublicClaimPublicationDecision =
  | Readonly<{ allowed: true; claimId: string; variantId: string; exactText: string }>
  | Readonly<{
      allowed: false;
      reason:
        | "REGISTER_INVALID"
        | "CLAIM_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "STATUS_INELIGIBLE"
        | "CHANNEL_INELIGIBLE"
        | "AUDIENCE_INELIGIBLE"
        | "NOT_EFFECTIVE"
        | "REVIEW_DUE"
        | "EXPIRED"
        | "APPROVAL_INCOMPLETE"
        | "EVIDENCE_INCOMPLETE"
        | "EVIDENCE_EXPIRED"
        | "TEXT_MISMATCH";
    }>;

export function assessPublicClaimPublication(
  inputRegister: PublicClaimRegister,
  inputRequest: PublicClaimPublicationRequest,
): PublicClaimPublicationDecision {
  const registerResult = publicClaimRegisterSchema.safeParse(inputRegister);
  const requestResult = publicClaimPublicationRequestSchema.safeParse(inputRequest);
  if (!registerResult.success || !requestResult.success) {
    return { allowed: false, reason: "REGISTER_INVALID" };
  }
  const register = registerResult.data;
  const request = requestResult.data;
  const claim = register.claims.find(({ claimId }) => claimId === request.claimId);
  if (!claim) return { allowed: false, reason: "CLAIM_NOT_FOUND" };
  const variant = claim.variants.find(({ variantId }) => variantId === request.variantId);
  if (!variant) return { allowed: false, reason: "VARIANT_NOT_FOUND" };
  if (variant.status !== "approved") return { allowed: false, reason: "STATUS_INELIGIBLE" };
  if (!variant.allowedChannels.includes(request.channel)) {
    return { allowed: false, reason: "CHANNEL_INELIGIBLE" };
  }
  if (!variant.audiences.includes(request.audience)) {
    return { allowed: false, reason: "AUDIENCE_INELIGIBLE" };
  }

  const at = Date.parse(request.at);
  const effectiveFrom = Date.parse(variant.effectiveFrom ?? "");
  const reviewAt = Date.parse(variant.reviewAt ?? "");
  if (!Number.isFinite(effectiveFrom) || at < effectiveFrom) {
    return { allowed: false, reason: "NOT_EFFECTIVE" };
  }
  if (!Number.isFinite(reviewAt) || at >= reviewAt) {
    return { allowed: false, reason: "REVIEW_DUE" };
  }
  if (variant.expiresAt && at >= Date.parse(variant.expiresAt)) {
    return { allowed: false, reason: "EXPIRED" };
  }

  const approvedRoles = new Set(variant.approvals.map(({ role }) => role));
  if (claim.requiredApprovers.some((role) => !approvedRoles.has(role))) {
    return { allowed: false, reason: "APPROVAL_INCOMPLETE" };
  }
  const evidence = new Map(variant.evidence.map((item) => [item.requirementId, item]));
  if (claim.evidenceRequirements.some(({ requirementId }) => !evidence.has(requirementId))) {
    return { allowed: false, reason: "EVIDENCE_INCOMPLETE" };
  }
  if (
    [...evidence.values()].some(
      ({ validUntil }) => validUntil !== null && at >= Date.parse(validUntil),
    )
  ) {
    return { allowed: false, reason: "EVIDENCE_EXPIRED" };
  }
  return Object.freeze({
    allowed: true,
    claimId: claim.claimId,
    variantId: variant.variantId,
    exactText: variant.exactText,
  });
}

export type PublicContentPublicationDecision =
  | Readonly<{ allowed: true; content: SelectedPublicContent }>
  | Readonly<{
      allowed: false;
      reason: "CONTENT_INELIGIBLE" | "CLAIM_INELIGIBLE";
      claimReason?: Extract<PublicClaimPublicationDecision, { allowed: false }>["reason"];
    }>;

export function assessClaimBearingContentPublication(input: {
  record: PublicContentRecord;
  context: PublicContentSelectionContext;
  claimRegister: PublicClaimRegister;
  claimReferences: readonly PublicClaimReference[];
  audience: z.infer<typeof publicClaimAudienceSchema>;
}): PublicContentPublicationDecision {
  const recordResult = publicContentRecordSchema.safeParse(input.record);
  const contextResult = publicContentSelectionContextSchema.safeParse(input.context);
  const referencesResult = z
    .array(publicClaimReferenceSchema)
    .min(1)
    .safeParse(input.claimReferences);
  if (!recordResult.success || !contextResult.success) {
    return { allowed: false, reason: "CONTENT_INELIGIBLE" };
  }
  if (!referencesResult.success) {
    return { allowed: false, reason: "CLAIM_INELIGIBLE", claimReason: "CLAIM_NOT_FOUND" };
  }
  const content = selectPublicContent(recordResult.data, contextResult.data);
  if (!content) return { allowed: false, reason: "CONTENT_INELIGIBLE" };

  for (const reference of referencesResult.data) {
    const decision = assessPublicClaimPublication(input.claimRegister, {
      claimId: reference.claimId,
      variantId: reference.variantId,
      channel: contextResult.data.channel,
      audience: input.audience,
      at: contextResult.data.at,
    });
    if (!decision.allowed) {
      return { allowed: false, reason: "CLAIM_INELIGIBLE", claimReason: decision.reason };
    }
    if (decision.exactText !== reference.exactText) {
      return { allowed: false, reason: "CLAIM_INELIGIBLE", claimReason: "TEXT_MISMATCH" };
    }
  }
  return Object.freeze({ allowed: true, content });
}
