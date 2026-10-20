import { z } from "zod";

export const productRehearsalOrigin =
  "https://meneer-product-rehearsal.itws-dns-cdn-hq.workers.dev";
export const productRehearsalWorker = "meneer-product-rehearsal";
export const productRehearsalInitialVersion = "b779e6fb-5a23-4c9f-b3fc-77d464da3bad";
export const productRehearsalAccount = "acct_1U32UbFfj16Nnr1i";
export const preparationManifestSchema = z
  .object({
    contract: z.literal("sprint15.product-rehearsal"),
    version: z.literal(1),
    exerciseId: z.uuid(),
    tenantId: z.uuid(),
    serviceId: z.uuid(),
    state: z.enum(["initialised", "webhook-created", "configuration-prepared"]),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    mainVersion: z.uuid(),
    sourceVersion: z.literal(productRehearsalInitialVersion),
    sourceEtag: z.string().regex(/^[a-f0-9]{64}$/),
    accessKey: z.string().regex(/^[a-f0-9]{64}$/),
    sessionKey: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    shippingKey: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    webhookId: z
      .string()
      .regex(/^we_[A-Za-z0-9]+$/)
      .optional(),
    webhookSecret: z
      .string()
      .regex(/^whsec_[A-Za-z0-9]+$/)
      .optional(),
    configurationVersion: z.uuid().optional(),
  })
  .strict();
export type ProductRehearsalPreparation = z.infer<typeof preparationManifestSchema>;

export function assertProductPreparationEnvironment(
  environment: Record<string, string | undefined>,
) {
  if (
    environment.PRODUCT_REHEARSAL_PREPARE_CONFIRM !== "separate-worker-test-only-no-promotion" ||
    environment.CI ||
    environment.SUPABASE_URL !== "https://gibfpolrdjotwvewgfsz.supabase.co" ||
    !environment.SUPABASE_SECRET_KEY ||
    environment.STRIPE_CHECKOUT_ACCOUNT_ID !== productRehearsalAccount ||
    !environment.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_")
  )
    throw Error("PRODUCT_REHEARSAL_PREPARATION_ENVIRONMENT_REJECTED");
}
export function productRehearsalConfiguration(
  manifest: ProductRehearsalPreparation,
  environment: Record<string, string | undefined>,
) {
  assertProductPreparationEnvironment(environment);
  if (
    !manifest.webhookId ||
    !manifest.webhookSecret ||
    manifest.tenantId === "80000000-0000-4000-8000-000000000001"
  )
    throw Error("PRODUCT_REHEARSAL_PREPARATION_SCOPE_REJECTED");
  return {
    PRODUCT_REHEARSAL_ORIGIN: productRehearsalOrigin,
    PRODUCT_REHEARSAL_TENANT_ID: manifest.tenantId,
    PRODUCT_REHEARSAL_EXPIRES_AT: manifest.expiresAt,
    PRODUCT_REHEARSAL_ACCESS_KEY: manifest.accessKey,
    IDENTITY_SESSION_KEY_BASE64: manifest.sessionKey,
    SUPABASE_URL: environment.SUPABASE_URL!,
    SUPABASE_SECRET_KEY: environment.SUPABASE_SECRET_KEY!,
    PRODUCT_CATALOGUE_MODE: "synthetic",
    PRODUCT_QUOTES_MODE: "synthetic",
    PRODUCT_ORDERING_MODE: "synthetic",
    PRODUCT_CATALOGUE_TENANT_ID: manifest.tenantId,
    PRODUCT_QUOTES_TENANT_ID: manifest.tenantId,
    PRODUCT_ORDERING_TENANT_ID: manifest.tenantId,
    COMMERCE_REVIEW_TENANT_ID: manifest.tenantId,
    COMMERCE_REVIEW_MODE: "enabled",
    COMMERCE_CHECKOUT_MODE: "sandbox",
    COMMERCE_WEBHOOK_MODE: "sandbox",
    COMMERCE_REFUND_MODE: "sandbox",
    STRIPE_SANDBOX_RETURN_ORIGIN: productRehearsalOrigin,
    STRIPE_CHECKOUT_ACCOUNT_ID: productRehearsalAccount,
    STRIPE_RESTRICTED_KEY: environment.STRIPE_RESTRICTED_KEY!,
    STRIPE_WEBHOOK_SIGNING_SECRET: manifest.webhookSecret,
    STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: manifest.serviceId,
    PUBLIC_REGISTRATION_MODE: "disabled",
    MOBILE_INVITATIONS_MODE: "disabled",
    MOBILE_INVITATIONS_EMAIL_MODE: "disabled",
    MOBILE_INVITATIONS_REDEMPTION_MODE: "disabled",
    MOBILE_INVITATIONS_WEBHOOK_MODE: "disabled",
    TRANSACTIONAL_NOTIFICATIONS_MODE: "disabled",
    OPERATIONS_ALERTS_MODE: "disabled",
  };
}
