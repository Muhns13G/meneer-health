import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildProductHostedCleanup, productNativePriceRootsSql } from "./product-rehearsal-cleanup";
const tenant = "e1590000-0000-4000-8000-000000000001";
it("resolves only native parent prices from the exact synthetic tenant/catalogue", () => {
  const catalogue = crypto.randomUUID();
  const sql = productNativePriceRootsSql(tenant, catalogue);
  expect(sql).toContain(`c.tenant_id='${tenant}'`);
  expect(sql).toContain(`c.id='${catalogue}'`);
  expect(sql).toContain(`p.version='catalogue-${catalogue}'`);
  expect(sql).toContain("c.provenance='local-synthetic'");
  expect(sql).toContain("p.environment='local-synthetic'");
  expect(() =>
    productNativePriceRootsSql(tenant, "';delete from commerce_private.prices;"),
  ).toThrow();
  expect(() =>
    productNativePriceRootsSql("80000000-0000-4000-8000-000000000001", catalogue),
  ).toThrow();
  expect(readFileSync("scripts/test-hosted-product-journey.ts", "utf8")).toContain(
    "productNativePriceRootsSql(tenant, ids.catalogue!)",
  );
});
it("keeps patient authentication out of the service repository client", () => {
  const source = readFileSync("scripts/test-hosted-product-journey.ts", "utf8");
  expect(source).not.toMatch(/admin\.auth\.(verifyOtp|setSession|signIn|exchangeCode)/);
  expect(source).toContain("provider.verifyEmailOtp(patient.email, await code(patient))");
  expect(source).toContain('rpc("has_pilot_account_evidence"');
});
const input = {
  tenant,
  exerciseId: crypto.randomUUID(),
  roots: [tenant],
  realAuthIds: [crypto.randomUUID()],
  baseline: [{ relation: "public.tenants", n: 1, fingerprint: "a".repeat(32) }],
};
it("preserves active real staff and pilot while limiting cleanup to validated manifested roots", () => {
  const sql = buildProductHostedCleanup(input);
  expect(sql).toContain("status='active'");
  expect(sql).not.toContain("status='suspended'");
  expect(sql).toContain(input.realAuthIds[0]);
  expect(sql).toContain("ONBOARDING_UNRELATED_DATA_CHANGED");
  expect(sql).toContain("ONBOARDING_TRIGGER_RESTORE_FAILED");
  expect(sql).toContain("ONBOARDING_BASELINE_RESTORE_FAILED");
  expect(sql).toContain("receipt.tenant_boundary=release.tenant_id");
  expect(sql).not.toContain("disable trigger payment_release_environment_guard");
  expect(sql).not.toMatch(/^\s*(truncate|delete[^;]*cascade)/im);
  expect(buildProductHostedCleanup({ ...input, rollback: true })).toContain("\nrollback;");
});
it("rejects real identities, unmanifested tenants, SQL-bearing identifiers and foreign schemas", () => {
  for (const changed of [
    { ...input, roots: [...input.roots, input.realAuthIds[0]!] },
    { ...input, tenant: "80000000-0000-4000-8000-000000000001" },
    { ...input, roots: [crypto.randomUUID()] },
    { ...input, roots: [tenant, "'; delete from auth.users;"] },
    { ...input, baseline: [{ relation: "auth.users", n: 0, fingerprint: "a".repeat(32) }] },
  ])
    expect(() => buildProductHostedCleanup(changed)).toThrow();
});
