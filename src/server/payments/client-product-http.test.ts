import { expect, it, vi } from "vitest";
import { createClientProductHttpHandler } from "./client-product-http";
import { clientProductsFixture } from "@/test/client-products-fixture";
import { sealPatientSession, patientSessionCookieName } from "../identity/patient-session-cookie";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "a2400000-0000-4000-8000-000000000001";
async function harness() {
  const now = new Date(),
    until = new Date(Date.now() + 60000),
    key = new Uint8Array(32).fill(9);
  const token = await sealPatientSession(
    {
      tenantId: id,
      session: {
        id,
        subjectId: id,
        providerSessionId: id,
        sessionClass: "patient",
        assurance: "aal1",
        status: "active",
        issuedAt: now,
        lastSeenAt: now,
        idleExpiresAt: until,
        absoluteExpiresAt: until,
      },
      providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt: until },
      providerIdentity: {
        provider: "supabase",
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal1",
        authenticatedAt: now,
        expiresAt: until,
        verifiedContact: { kind: "email", value: "commerce@example.invalid", verifiedAt: now },
      },
    },
    key,
  );
  const execute = vi.fn(async () => clientProductsFixture());
  const authorise = vi.fn(async () => ({
    context: {
      tenantId: id,
      subjectId: id,
      sessionId: id,
      providerSubject: id,
      providerSessionId: id,
      verifiedEmail: "commerce@example.invalid",
      purpose: "account" as const,
    },
    expiresAt: until,
  }));
  const bindings = {
    PRODUCT_CATALOGUE_MODE: "synthetic",
    PRODUCT_CATALOGUE_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: btoa(String.fromCharCode(...key)),
    REQUEST_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  const request = (
    body: unknown = { action: "read" },
    headers: Record<string, string> = {},
    path = "/portal/products/command",
  ) =>
    new Request("https://meneerhealth.co.za" + path, {
      method: "POST",
      headers: {
        Cookie: patientSessionCookieName + "=" + token,
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    bindings,
    execute,
    authorise,
    request,
    handler: createClientProductHttpHandler(bindings, { execute, authorise }),
  };
}

it("requires sealed own-client authority and returns strict private catalogue", async () => {
  const h = await harness();
  const r = await h.handler(h.request());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(h.execute).toHaveBeenCalledWith(
    expect.objectContaining({ tenantId: id, subjectId: id }),
    { action: "read" },
    "local-synthetic",
  );
  expect(await r.json()).toMatchObject({ version: "synthetic-v1", synthetic: true });
});
it("denies disabled, missing proof, cross-origin, URL state and wrong tenant", async () => {
  const h = await harness();
  expect(
    (
      await createClientProductHttpHandler({ ...h.bindings, PRODUCT_CATALOGUE_MODE: "disabled" })(
        h.request(),
      )
    ).status,
  ).toBe(412);
  expect((await h.handler(h.request({}, { Cookie: "" }))).status).toBe(401);
  expect(
    (await h.handler(h.request({ action: "read" }, { Origin: "https://other.invalid" }))).status,
  ).toBe(403);
  expect(
    (await h.handler(h.request({ action: "read" }, {}, "/portal/products/command?product=private")))
      .status,
  ).toBe(404);
  expect(
    (
      await createClientProductHttpHandler({
        ...h.bindings,
        PRODUCT_CATALOGUE_TENANT_ID: "15300000-0000-4000-8000-000000000009",
      })(h.request())
    ).status,
  ).toBe(403);
  expect(h.execute).not.toHaveBeenCalled();
});
it("rejects caller totals and mismatched request keys", async () => {
  const h = await harness();
  const v = clientProductsFixture();
  expect((await h.handler(h.request({ action: "read", paid: true }))).status).toBe(422);
  expect(
    (
      await h.handler(
        h.request({
          action: "register_interest",
          catalogueId: v.catalogueId,
          productId: v.items[0]!.productId,
          requestKey: v.catalogueId,
        }),
      )
    ).status,
  ).toBe(422);
  expect(h.execute).not.toHaveBeenCalled();
});
it("maps current-session denial, catalogue conflict and private payload rejection", async () => {
  const h = await harness();
  h.execute.mockRejectedValueOnce(new IdentityRejectedError());
  expect((await h.handler(h.request())).status).toBe(401);
  h.execute.mockRejectedValueOnce(new Error("CATALOGUE_CONFLICT"));
  expect((await h.handler(h.request())).status).toBe(409);
  const unsafeProjection = { ...clientProductsFixture(), wholesaleCost: 1 };
  h.execute.mockResolvedValueOnce(unsafeProjection);
  expect((await h.handler(h.request())).status).toBe(503);
});
it("rejects synthetic projection in pilot mode and expired responses", async () => {
  const h = await harness();
  expect(
    (
      await createClientProductHttpHandler(
        { ...h.bindings, PRODUCT_CATALOGUE_MODE: "pilot" },
        { execute: h.execute, authorise: h.authorise },
      )(h.request())
    ).status,
  ).toBe(503);
  h.execute.mockResolvedValueOnce({
    ...clientProductsFixture(),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  expect((await h.handler(h.request())).status).toBe(401);
});
