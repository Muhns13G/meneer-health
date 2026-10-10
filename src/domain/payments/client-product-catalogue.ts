import { z } from "zod";
import { productInterestCommandSchema } from "./product-order-commands";

// Bind interest to the exact displayed catalogue, never silently replace a changed price version.
export const clientProductCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }).strict(),
  productInterestCommandSchema.extend({ catalogueId: z.uuid() }).strict(),
]);
export const clientCatalogueViewSchema = z
  .object({
    catalogueId: z.uuid().nullable(),
    version: z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/)
      .nullable(),
    synthetic: z.boolean(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            description: z.string().min(1).max(160),
            unitAmountMinor: z.int().min(1).max(100_000_000),
            currency: z.literal("zar"),
            interested: z.boolean(),
          })
          .strict(),
      )
      .max(250),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.catalogueId === null) !== (v.version === null) ||
      (v.catalogueId === null && v.items.length !== 0) ||
      new Set(v.items.map((i) => i.productId)).size !== v.items.length
    )
      ctx.addIssue({ code: "custom", message: "Invalid catalogue projection." });
  });
export type ClientCatalogueView = z.infer<typeof clientCatalogueViewSchema>;
