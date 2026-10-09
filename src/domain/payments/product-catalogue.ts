import { z } from "zod";

export const preciseWellnessScheduleHash =
  "6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const version = z.string().regex(/^[a-z0-9-]{1,80}$/);
export const catalogueItemSchema = z
  .object({
    productId: z.uuid(),
    sku: z.string().regex(/^[a-z0-9-]{1,80}$/),
    description: z.string().trim().min(1).max(160),
    unitAmountMinor: z.int().min(1).max(100_000_000),
    maxQuantity: z.int().min(1).max(10),
  })
  .strict();

// Only customer-facing RRP data. Wholesale costs, claims and provider mappings are rejected.
export const catalogueImportSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    version,
    provenance: z.enum(["local-synthetic", "precise-wellness-rrp"]),
    sourceFingerprint: hash,
    approvalReference: z.uuid(),
    importedBy: z.uuid(),
    reviewedBy: z.uuid(),
    currency: z.literal("zar"),
    taxTreatment: z.literal("vat-inclusive-planning"),
    effectiveAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
    items: z.array(catalogueItemSchema).min(1).max(250),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.importedBy === v.reviewedBy)
      ctx.addIssue({ code: "custom", message: "Independent review required." });
    if (Date.parse(v.expiresAt) <= Date.parse(v.effectiveAt))
      ctx.addIssue({ code: "custom", message: "Invalid validity window." });
    if (
      v.provenance === "precise-wellness-rrp" &&
      v.sourceFingerprint !== preciseWellnessScheduleHash
    )
      ctx.addIssue({ code: "custom", message: "Unapproved source fingerprint." });
    if (
      new Set(v.items.map((i) => i.productId)).size !== v.items.length ||
      new Set(v.items.map((i) => i.sku)).size !== v.items.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate product or SKU." });
  });
export type CatalogueImport = z.infer<typeof catalogueImportSchema>;

export const shippingAddressSchema = z
  .object({
    recipient: z.string().trim().min(1).max(120),
    line1: z.string().trim().min(1).max(160),
    line2: z.string().trim().max(160).optional(),
    locality: z.string().trim().min(1).max(100),
    province: z.string().trim().min(1).max(100),
    postalCode: z.string().regex(/^\d{4}$/),
    country: z.literal("ZA"),
  })
  .strict();

export const shippingScopeSchema = z
  .object({
    tenantId: z.uuid(),
    subjectId: z.uuid(),
    caseId: z.uuid(),
    snapshotId: z.uuid(),
    version: z.int().min(1),
  })
  .strict();
export const shippingEnvelopeSchema = z
  .object({
    algorithm: z.literal("AES-256-GCM"),
    keyId: z.string().regex(/^[a-z0-9-]{1,48}$/),
    scope: shippingScopeSchema,
    nonce: z.string().regex(/^[A-Za-z0-9+/]{16}$/),
    ciphertext: z
      .string()
      .min(24)
      .max(8192)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict();
export type ShippingScope = z.infer<typeof shippingScopeSchema>;
