import { z } from "zod";

import { contractDefinitionSchema } from "./catalogue";
import { rfc3339TimestampSchema } from "./shared";

export const publicContentContractName = "public-content.catalogue" as const;
export const publicContentContractVersion = 1 as const;

export const publicContentCatalogueContract = contractDefinitionSchema.parse({
  name: publicContentContractName,
  kind: "content-catalogue",
  owner: "Public content governance module",
  consumers: ["Website adapters", "campaign adapters", "future approved public channels"],
  version: publicContentContractVersion,
  sensitivity: "public",
  idempotency: "not-applicable",
  lifecycle: "active",
});

export const publicContentIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/)
  .max(96);

export const publicContentLocaleSchema = z
  .string()
  .regex(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-\d{3})?$/);

export const publicContentChannelSchema = z.enum([
  "website-homepage",
  "website-route",
  "website-legal",
  "campaign",
  "poster",
  "metadata",
  "social-preview",
  "support-script",
  "lifecycle-message",
  "future-public-mcp",
]);

export const publicContentOwnerRoleSchema = z.enum([
  "business-owner",
  "content-owner",
  "clinical-owner",
  "legal-privacy-owner",
  "commercial-owner",
  "operations-owner",
  "security-owner",
  "release-owner",
]);

export const publicContentLifecycleStatusSchema = z.enum([
  "draft",
  "approved",
  "rejected",
  "withdrawn",
  "archived",
]);

export const canonicalJourneyPhaseIdSchema = z.enum([
  "pathway-and-intake",
  "screening-and-review",
  "consultation-and-decision",
  "price-and-payment",
  "pharmacy-and-delivery",
]);

export const journeyProjectionIdSchema = z.enum([
  "marketing-three-step",
  "journey-four-event",
  "intake-progress",
  "detailed-confirmation",
  "campaign-metadata",
]);

const publicTextSchema = z.string().trim().min(1).max(2_000);
const publicLabelSchema = z.string().trim().min(1).max(160);
const publicDestinationSchema = z
  .string()
  .max(500)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("https://") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:"),
    "Public destinations must use a relative route or an approved secure/contact scheme.",
  );

const treatmentContentSchema = z
  .object({
    kind: z.literal("treatment"),
    treatmentId: publicContentIdSchema,
    label: publicLabelSchema,
    title: publicLabelSchema,
    description: publicTextSchema,
    availability: z.enum(["public-information", "pilot-gated", "unavailable"]),
    destination: publicDestinationSchema,
  })
  .strict();

const journeyPhaseContentSchema = z
  .object({
    kind: z.literal("journey-phase"),
    phaseId: canonicalJourneyPhaseIdSchema,
    position: z.int().min(1).max(5),
    title: publicLabelSchema,
    summary: publicTextSchema,
    conditional: z.boolean(),
  })
  .strict();

const journeyProjectionContentSchema = z
  .object({
    kind: z.literal("journey-projection"),
    projectionId: journeyProjectionIdSchema,
    title: publicLabelSchema,
    summary: publicTextSchema,
    phaseIds: z.array(canonicalJourneyPhaseIdSchema).min(1).max(5),
  })
  .strict();

const supportRouteContentSchema = z
  .object({
    kind: z.literal("support-route"),
    purpose: z.enum(["general", "privacy", "complaint", "clinical", "emergency"]),
    availability: z.enum(["available", "unavailable"]),
    label: publicLabelSchema,
    destination: publicDestinationSchema.nullable(),
    serviceExpectation: publicTextSchema.nullable(),
  })
  .strict();

const pricingStateContentSchema = z
  .object({
    kind: z.literal("pricing-state"),
    scenario: z.enum(["consultation-only", "medication-delivery", "bundle"]),
    publicationState: z.enum(["unpublished", "approved"]),
    currency: z.literal("ZAR"),
    priceVersion: publicContentIdSchema.nullable(),
    amountMinor: z.int().nonnegative().nullable(),
    summary: publicTextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const hasPriceVersion = value.priceVersion !== null;
    const hasAmount = value.amountMinor !== null;
    if (hasPriceVersion !== hasAmount) {
      context.addIssue({
        code: "custom",
        message: "Pricing version and minor-unit amount must be supplied together.",
      });
    }
    const hasApprovedPrice = hasPriceVersion && hasAmount;
    if (value.publicationState === "approved" && !hasApprovedPrice) {
      context.addIssue({
        code: "custom",
        message: "Approved pricing content requires a version and minor-unit amount.",
      });
    }
    if (value.publicationState === "unpublished" && hasApprovedPrice) {
      context.addIssue({
        code: "custom",
        message: "Unpublished pricing content cannot expose a publishable price.",
      });
    }
  });

const policyContentSchema = z
  .object({
    kind: z.literal("policy"),
    policyId: publicContentIdSchema,
    title: publicLabelSchema,
    summary: publicTextSchema,
    destination: z.string().startsWith("/").max(300),
  })
  .strict();

const trustMarkerContentSchema = z
  .object({
    kind: z.literal("trust-marker"),
    claimId: publicContentIdSchema,
    text: publicTextSchema,
  })
  .strict();

const metadataContentSchema = z
  .object({
    kind: z.literal("metadata"),
    routePath: z.string().startsWith("/").max(300),
    title: publicLabelSchema,
    description: publicTextSchema,
  })
  .strict();

const campaignMessageContentSchema = z
  .object({
    kind: z.literal("campaign-message"),
    campaignId: publicContentIdSchema,
    headline: publicLabelSchema,
    body: publicTextSchema,
  })
  .strict();

export const publicContentValueSchema = z.union([
  treatmentContentSchema,
  journeyPhaseContentSchema,
  journeyProjectionContentSchema,
  supportRouteContentSchema,
  pricingStateContentSchema,
  policyContentSchema,
  trustMarkerContentSchema,
  metadataContentSchema,
  campaignMessageContentSchema,
]);

export const publicContentKindSchema = z.enum([
  "treatment",
  "journey-phase",
  "journey-projection",
  "support-route",
  "pricing-state",
  "policy",
  "trust-marker",
  "metadata",
  "campaign-message",
]);

const contentApprovalSchema = z
  .object({
    role: publicContentOwnerRoleSchema,
    approvedAt: rfc3339TimestampSchema,
  })
  .strict();

const emergencyWithdrawalSchema = z
  .object({
    kind: z.literal("emergency"),
    reason: z.enum([
      "claim-evidence-invalid",
      "clinical-safety",
      "legal-privacy",
      "commercial-operational",
      "security-incident",
      "release-error",
    ]),
    withdrawnAt: rfc3339TimestampSchema,
    withdrawnBy: publicContentOwnerRoleSchema,
    replacementContentId: publicContentIdSchema.nullable(),
  })
  .strict();

const contentArchiveSchema = z
  .object({
    archivedAt: rfc3339TimestampSchema,
    archivedBy: publicContentOwnerRoleSchema,
    reason: z.enum(["superseded", "retired", "duplicate", "channel-closed"]),
  })
  .strict();

const publicContentLifecycleSchema = z
  .object({
    status: publicContentLifecycleStatusSchema,
    effectiveFrom: rfc3339TimestampSchema.nullable(),
    reviewAt: rfc3339TimestampSchema.nullable(),
    expiresAt: rfc3339TimestampSchema.nullable(),
    approvals: z.array(contentApprovalSchema),
    withdrawal: emergencyWithdrawalSchema.nullable(),
    archive: contentArchiveSchema.nullable(),
  })
  .strict()
  .superRefine((lifecycle, context) => {
    const approvalRoles = lifecycle.approvals.map(({ role }) => role);
    if (new Set(approvalRoles).size !== approvalRoles.length) {
      context.addIssue({ code: "custom", message: "Approval roles must be unique." });
    }

    if (lifecycle.status === "approved") {
      if (!lifecycle.effectiveFrom || !lifecycle.reviewAt) {
        context.addIssue({
          code: "custom",
          message: "Approved content requires effective and review timestamps.",
        });
      }
      if (lifecycle.withdrawal || lifecycle.archive) {
        context.addIssue({
          code: "custom",
          message: "Approved content cannot also be withdrawn or archived.",
        });
      }
    }
    if (lifecycle.status === "withdrawn" && !lifecycle.withdrawal) {
      context.addIssue({
        code: "custom",
        message: "Withdrawn content requires emergency-withdrawal evidence.",
      });
    }
    if (lifecycle.status === "archived" && !lifecycle.archive) {
      context.addIssue({ code: "custom", message: "Archived content requires archive evidence." });
    }
    if (lifecycle.status !== "withdrawn" && lifecycle.withdrawal) {
      context.addIssue({
        code: "custom",
        message: "Emergency-withdrawal evidence requires withdrawn status.",
      });
    }
    if (lifecycle.status !== "archived" && lifecycle.archive) {
      context.addIssue({ code: "custom", message: "Archive evidence requires archived status." });
    }

    if (lifecycle.effectiveFrom && lifecycle.reviewAt) {
      if (Date.parse(lifecycle.reviewAt) <= Date.parse(lifecycle.effectiveFrom)) {
        context.addIssue({
          code: "custom",
          message: "Review must follow the effective timestamp.",
        });
      }
    }
    if (lifecycle.effectiveFrom && lifecycle.expiresAt) {
      if (Date.parse(lifecycle.expiresAt) <= Date.parse(lifecycle.effectiveFrom)) {
        context.addIssue({
          code: "custom",
          message: "Expiry must follow the effective timestamp.",
        });
      }
    }
    if (lifecycle.status === "approved" && lifecycle.effectiveFrom) {
      const effectiveAt = Date.parse(lifecycle.effectiveFrom);
      if (lifecycle.approvals.some(({ approvedAt }) => Date.parse(approvedAt) > effectiveAt)) {
        context.addIssue({
          code: "custom",
          message: "Every approval must precede or match the effective timestamp.",
        });
      }
    }
  });

const publicContentLocalisationSchema = z
  .object({
    locale: publicContentLocaleSchema,
    value: publicContentValueSchema,
  })
  .strict();

export const publicContentRevisionSchema = z
  .object({
    revision: z.int().positive(),
    supersedesRevision: z.int().positive().nullable(),
    kind: publicContentKindSchema,
    accountableOwner: publicContentOwnerRoleSchema,
    requiredApprovers: z.array(publicContentOwnerRoleSchema).min(1),
    channels: z.array(publicContentChannelSchema).min(1),
    localisations: z.array(publicContentLocalisationSchema).min(1),
    lifecycle: publicContentLifecycleSchema,
  })
  .strict()
  .superRefine((revision, context) => {
    const unique = (values: readonly string[]) => new Set(values).size === values.length;
    if (!unique(revision.requiredApprovers)) {
      context.addIssue({ code: "custom", message: "Required approver roles must be unique." });
    }
    if (!unique(revision.channels)) {
      context.addIssue({ code: "custom", message: "Content channels must be unique." });
    }
    if (!unique(revision.localisations.map(({ locale }) => locale))) {
      context.addIssue({ code: "custom", message: "Localisation entries must be unique." });
    }
    if (revision.localisations.some(({ value }) => value.kind !== revision.kind)) {
      context.addIssue({
        code: "custom",
        message: "Every localised value must match the revision content kind.",
      });
    }
    if (revision.revision === 1 && revision.supersedesRevision !== null) {
      context.addIssue({ code: "custom", message: "The first revision cannot supersede another." });
    }
    if (revision.revision > 1 && revision.supersedesRevision !== revision.revision - 1) {
      context.addIssue({
        code: "custom",
        message: "Each later revision must supersede the immediately preceding revision.",
      });
    }

    if (revision.lifecycle.status === "approved") {
      const approvedRoles = new Set(revision.lifecycle.approvals.map(({ role }) => role));
      for (const requiredRole of revision.requiredApprovers) {
        if (!approvedRoles.has(requiredRole)) {
          context.addIssue({
            code: "custom",
            message: `Approved content is missing required approval from ${requiredRole}.`,
          });
        }
      }
    }
  });

export const publicContentRecordSchema = z
  .object({
    contentId: publicContentIdSchema,
    selectedRevision: z.int().positive().nullable(),
    revisions: z.array(publicContentRevisionSchema).min(1),
  })
  .strict()
  .superRefine((record, context) => {
    const revisionNumbers = record.revisions.map(({ revision }) => revision);
    if (new Set(revisionNumbers).size !== revisionNumbers.length) {
      context.addIssue({ code: "custom", message: "Revision numbers must be unique." });
    }
    const sorted = [...revisionNumbers].sort((left, right) => left - right);
    if (sorted.some((revision, index) => revision !== index + 1)) {
      context.addIssue({ code: "custom", message: "Revision history must be contiguous." });
    }
    if (
      record.selectedRevision !== null &&
      !record.revisions.some(({ revision }) => revision === record.selectedRevision)
    ) {
      context.addIssue({ code: "custom", message: "Selected revision must exist in the history." });
    }
  });

export const publicContentCatalogueSchema = z
  .object({
    contract: z.literal(publicContentContractName),
    version: z.literal(publicContentContractVersion),
    catalogueVersion: z.string().regex(/^\d{4}\.\d{2}\.\d{2}\.\d+$/),
    generatedAt: rfc3339TimestampSchema,
    defaultLocale: publicContentLocaleSchema,
    records: z.array(publicContentRecordSchema).min(1),
  })
  .strict()
  .superRefine((catalogue, context) => {
    const contentIds = catalogue.records.map(({ contentId }) => contentId);
    if (new Set(contentIds).size !== contentIds.length) {
      context.addIssue({ code: "custom", message: "Content identifiers must be unique." });
    }
    for (const record of catalogue.records) {
      const selected = record.revisions.find(
        ({ revision }) => revision === record.selectedRevision,
      );
      if (
        selected &&
        !selected.localisations.some(({ locale }) => locale === catalogue.defaultLocale)
      ) {
        context.addIssue({
          code: "custom",
          message: `Selected content ${record.contentId} requires the catalogue default locale.`,
        });
      }
    }
  });

export const publicContentSelectionContextSchema = z
  .object({
    channel: publicContentChannelSchema,
    locale: publicContentLocaleSchema,
    at: rfc3339TimestampSchema,
  })
  .strict();

export type PublicContentCatalogue = z.infer<typeof publicContentCatalogueSchema>;
export type PublicContentRecord = z.infer<typeof publicContentRecordSchema>;
export type PublicContentRevision = z.infer<typeof publicContentRevisionSchema>;
export type PublicContentValue = z.infer<typeof publicContentValueSchema>;
export type PublicContentSelectionContext = z.infer<typeof publicContentSelectionContextSchema>;

export type SelectedPublicContent = Readonly<{
  contentId: string;
  revision: number;
  locale: string;
  value: PublicContentValue;
}>;

export function selectPublicContent(
  inputRecord: PublicContentRecord,
  inputContext: PublicContentSelectionContext,
): SelectedPublicContent | undefined {
  const record = publicContentRecordSchema.parse(inputRecord);
  const context = publicContentSelectionContextSchema.parse(inputContext);
  const revision = record.revisions.find(
    ({ revision: number }) => number === record.selectedRevision,
  );
  if (!revision || revision.lifecycle.status !== "approved") return undefined;
  if (!revision.channels.includes(context.channel)) return undefined;

  const at = Date.parse(context.at);
  const effectiveFrom = revision.lifecycle.effectiveFrom
    ? Date.parse(revision.lifecycle.effectiveFrom)
    : Number.POSITIVE_INFINITY;
  const reviewAt = revision.lifecycle.reviewAt
    ? Date.parse(revision.lifecycle.reviewAt)
    : Number.NEGATIVE_INFINITY;
  const expiresAt = revision.lifecycle.expiresAt
    ? Date.parse(revision.lifecycle.expiresAt)
    : Number.POSITIVE_INFINITY;
  if (at < effectiveFrom || at >= reviewAt || at >= expiresAt) return undefined;

  const approvedRoles = new Set(revision.lifecycle.approvals.map(({ role }) => role));
  if (revision.requiredApprovers.some((role) => !approvedRoles.has(role))) return undefined;

  const localisation = revision.localisations.find(({ locale }) => locale === context.locale);
  if (!localisation) return undefined;
  return Object.freeze({
    contentId: record.contentId,
    revision: revision.revision,
    locale: localisation.locale,
    value: localisation.value,
  });
}
