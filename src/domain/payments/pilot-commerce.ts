import { z } from "zod";

export const reviewDepositMinor = 99_900;
export const commercePolicyVersion = "pilot-commerce-policy-v1";
export const maxCommerceAmountMinor = 100_000_000;
const minor = z.int().min(0).max(maxCommerceAmountMinor);

export const pilotOfferSelectionSchema = z
  .object({
    caseId: z.uuid(),
    scenario: z.enum(["review_deposit", "approved_product_order"]),
    items: z
      .array(z.object({ priceId: z.uuid(), quantity: z.int().min(1).max(10) }).strict())
      .max(20),
    deliveryQuoteId: z.uuid().optional(),
    requestKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.items.map((item) => item.priceId)).size !== value.items.length) {
      context.addIssue({ code: "custom", message: "Duplicate price selection." });
    }
    if (
      (value.scenario === "review_deposit" &&
        (value.items.length !== 0 || value.deliveryQuoteId !== undefined)) ||
      (value.scenario === "approved_product_order" &&
        (value.items.length === 0 || value.deliveryQuoteId === undefined))
    ) {
      context.addIssue({ code: "custom", message: "Invalid scenario selection." });
    }
  });

export const pilotPriceSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["review_deposit", "product"]),
    version: z.string().regex(/^[a-z0-9-]{1,80}$/),
    description: z.string().min(1).max(160),
    unitAmountMinor: minor,
    currency: z.literal("zar"),
    taxTreatment: z.literal("vat-inclusive-planning"),
    effectiveAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    approvalReference: z.uuid(),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    environment: z.literal("local-synthetic"),
    status: z.enum(["approved", "withdrawn"]),
  })
  .strict()
  .refine((price) => Date.parse(price.expiresAt) > Date.parse(price.effectiveAt))
  .refine(
    (price) => price.kind !== "review_deposit" || price.unitAmountMinor === reviewDepositMinor,
  );

export type PilotPrice = z.infer<typeof pilotPriceSchema>;

export function calculatePilotOrder(input: unknown) {
  const parsed = z
    .object({
      productSubtotalMinor: minor,
      deliveryMinor: minor,
      deposit: z.enum(["available", "applied", "missing", "uncertain"]),
      firstOrder: z.boolean(),
    })
    .strict()
    .parse(input);
  if (
    (parsed.firstOrder && parsed.deposit !== "available") ||
    (!parsed.firstOrder && parsed.deposit !== "applied")
  ) {
    throw new Error("COMMERCE_DEPOSIT_UNAVAILABLE");
  }
  const available = parsed.firstOrder ? reviewDepositMinor : 0;
  const creditMinor = Math.min(parsed.productSubtotalMinor, available);
  const amountTotalMinor = parsed.productSubtotalMinor - creditMinor + parsed.deliveryMinor;
  if (amountTotalMinor > maxCommerceAmountMinor) throw new Error("COMMERCE_AMOUNT_INVALID");
  return Object.freeze({
    productSubtotalMinor: parsed.productSubtotalMinor,
    deliveryMinor: parsed.deliveryMinor,
    creditMinor,
    amountTotalMinor,
    unusedDepositRefundMinor: available - creditMinor,
    noAdditionalPayment: amountTotalMinor === 0,
    policyVersion: commercePolicyVersion,
  });
}

// This evaluates trusted server facts, never browser claims or medical narrative. Database
// authority/reservation is independently enforced; this helper cannot mark a case paid.
export function assertPilotCommerceReadiness(input: unknown): void {
  const ready = z
    .object({
      scenario: z.enum(["review_deposit", "approved_product_order"]),
      activeOwnAccount: z.literal(true),
      submittedIntake: z.literal(true),
      unrestricted: z.literal(true),
      safetyClear: z.literal(true),
      catalogueCurrent: z.literal(true),
      clinicalApproved: z.boolean(),
      stockConfirmed: z.boolean(),
      pharmacyAuthorised: z.boolean(),
      custodyReady: z.boolean(),
      addressConfirmed: z.boolean(),
      deliveryCurrent: z.boolean(),
    })
    .strict()
    .parse(input);
  if (
    ready.scenario === "approved_product_order" &&
    !(
      ready.clinicalApproved &&
      ready.stockConfirmed &&
      ready.pharmacyAuthorised &&
      ready.custodyReady &&
      ready.addressConfirmed &&
      ready.deliveryCurrent
    )
  ) {
    throw new Error("COMMERCE_NOT_READY");
  }
}

export function calculateCatalogueSubtotal(
  prices: readonly PilotPrice[],
  selection: readonly { priceId: string; quantity: number }[],
  observedAt: Date,
): number {
  if (!Number.isFinite(observedAt.getTime()) || !selection.length || selection.length > 20) {
    throw new Error("COMMERCE_SELECTION_INVALID");
  }
  const seen = new Set<string>();
  let subtotal = 0;
  for (const item of selection) {
    if (
      seen.has(item.priceId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    ) {
      throw new Error("COMMERCE_SELECTION_INVALID");
    }
    seen.add(item.priceId);
    const matches = prices.filter((price) => price.id === item.priceId);
    if (matches.length !== 1) throw new Error("COMMERCE_PRICE_UNAVAILABLE");
    const price = pilotPriceSchema.parse(matches[0]);
    if (
      price.kind !== "product" ||
      price.status !== "approved" ||
      Date.parse(price.effectiveAt) > observedAt.getTime() ||
      Date.parse(price.expiresAt) <= observedAt.getTime()
    )
      throw new Error("COMMERCE_PRICE_UNAVAILABLE");
    subtotal += price.unitAmountMinor * item.quantity;
    if (!Number.isSafeInteger(subtotal) || subtotal > maxCommerceAmountMinor) {
      throw new Error("COMMERCE_AMOUNT_INVALID");
    }
  }
  return subtotal;
}
