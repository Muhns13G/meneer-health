import { expect, it } from "vitest";
import {
  assertProductPreparationEnvironment,
  preparationManifestSchema,
  productRehearsalAccount,
  productRehearsalConfiguration,
  productRehearsalInitialVersion,
} from "./product-rehearsal-preparation";
import { validProductRehearsalBindings } from "../../src/server/security/product-rehearsal-boundary";
const environment = {
  PRODUCT_REHEARSAL_PREPARE_CONFIRM: "separate-worker-test-only-no-promotion",
  SUPABASE_URL: "https://gibfpolrdjotwvewgfsz.supabase.co",
  SUPABASE_SECRET_KEY: "synthetic-no-provider-use",
  STRIPE_CHECKOUT_ACCOUNT_ID: productRehearsalAccount,
  STRIPE_RESTRICTED_KEY: "rk_test_synthetic_no_provider_use",
  STRIPE_LIVE_RESTRICTED_KEY: "rk_live_must_not_be_copied",
  BREVO_API_KEY: "must_not_be_copied",
};
function fixture() {
  return preparationManifestSchema.parse({
    contract: "sprint15.product-rehearsal",
    version: 1,
    exerciseId: crypto.randomUUID(),
    tenantId: crypto.randomUUID(),
    serviceId: crypto.randomUUID(),
    state: "webhook-created",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    mainVersion: crypto.randomUUID(),
    sourceVersion: productRehearsalInitialVersion,
    sourceEtag: "a".repeat(64),
    accessKey: "b".repeat(64),
    sessionKey: "A".repeat(43) + "=",
    shippingKey: "B".repeat(43) + "=",
    webhookId: "we_syntheticOnly",
    webhookSecret: "whsec_syntheticOnly",
  });
}
it("requires explicit separate-target test authority and never accepts live credentials", () => {
  expect(() => assertProductPreparationEnvironment(environment)).not.toThrow();
  for (const changed of [
    { ...environment, PRODUCT_REHEARSAL_PREPARE_CONFIRM: undefined },
    { ...environment, CI: "true" },
    { ...environment, STRIPE_RESTRICTED_KEY: "rk_live_synthetic" },
    { ...environment, STRIPE_CHECKOUT_ACCOUNT_ID: "acct_other" },
    { ...environment, SUPABASE_URL: "https://other.supabase.co" },
  ])
    expect(() => assertProductPreparationEnvironment(changed)).toThrow();
});
it("uses an explicit configuration allowlist rather than copying the production environment", () => {
  const manifest = fixture();
  const values = productRehearsalConfiguration(manifest, environment);
  expect(validProductRehearsalBindings(values)).toBe(true);
  expect(values.PRODUCT_REHEARSAL_TENANT_ID).toBe(manifest.tenantId);
  expect(values.PRODUCT_ORDERING_TENANT_ID).toBe(manifest.tenantId);
  expect(values.COMMERCE_REVIEW_TENANT_ID).toBe(manifest.tenantId);
  expect(values.PUBLIC_REGISTRATION_MODE).toBe("disabled");
  expect(values.TRANSACTIONAL_NOTIFICATIONS_MODE).toBe("disabled");
  expect(values).not.toHaveProperty("STRIPE_LIVE_RESTRICTED_KEY");
  expect(values).not.toHaveProperty("BREVO_API_KEY");
  expect(values).not.toHaveProperty("shippingKey");
  expect(() =>
    productRehearsalConfiguration(
      { ...manifest, tenantId: "80000000-0000-4000-8000-000000000001" },
      environment,
    ),
  ).toThrow();
  expect(() =>
    productRehearsalConfiguration({ ...manifest, webhookSecret: undefined }, environment),
  ).toThrow();
});
