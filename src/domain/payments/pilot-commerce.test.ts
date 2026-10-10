import { describe, expect, it } from "vitest";
import {
  assertPilotCommerceReadiness,
  calculateCatalogueSubtotal,
  calculatePilotOrder,
  pilotOfferSelectionSchema,
  pilotPriceSchema,
  type PilotPrice,
} from "./pilot-commerce";

const price: PilotPrice = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "product",
  version: "pilot-commerce-synthetic-v1",
  description: "Synthetic item",
  unitAmountMinor: 150000,
  currency: "zar",
  taxTreatment: "vat-inclusive-planning",
  effectiveAt: "2026-01-01T00:00:00Z",
  expiresAt: "2027-01-01T00:00:00Z",
  approvalReference: "22222222-2222-4222-8222-222222222222",
  sourceFingerprint: "a".repeat(64),
  environment: "local-synthetic",
  status: "approved",
};
const now = new Date("2026-10-05T00:00:00Z");
const selection = [{ priceId: price.id, quantity: 1 }];
const readiness = {
  scenario: "approved_product_order",
  activeOwnAccount: true,
  submittedIntake: true,
  unrestricted: true,
  safetyClear: true,
  catalogueCurrent: true,
  clinicalApproved: true,
  stockConfirmed: true,
  pharmacyAuthorised: true,
  custodyReady: true,
  addressConfirmed: true,
  deliveryCurrent: true,
};

describe("pilot commerce", () => {
  it("permits truthful RRP product provenance but not a relabelled deposit", () => {
    expect(
      pilotPriceSchema.safeParse({ ...price, environment: "precise-wellness-rrp" }).success,
    ).toBe(true);
    expect(
      pilotPriceSchema.safeParse({
        ...price,
        kind: "review_deposit",
        unitAmountMinor: 99900,
        environment: "precise-wellness-rrp",
      }).success,
    ).toBe(false);
  });
  it.each([
    [150000, 10000, 99900, 60100, 0],
    [80000, 10000, 80000, 10000, 19900],
    [99900, 0, 99900, 0, 0],
    [80000, 0, 80000, 0, 19900],
  ])("calculates %i plus %i", (p, d, c, t, u) => {
    expect(
      calculatePilotOrder({
        productSubtotalMinor: p,
        deliveryMinor: d,
        deposit: "available",
        firstOrder: true,
      }),
    ).toMatchObject({
      creditMinor: c,
      amountTotalMinor: t,
      unusedDepositRefundMinor: u,
      noAdditionalPayment: t === 0,
    });
  });
  it("does not reuse applied credit", () => {
    expect(
      calculatePilotOrder({
        productSubtotalMinor: 80000,
        deliveryMinor: 10000,
        deposit: "applied",
        firstOrder: false,
      }),
    ).toMatchObject({ creditMinor: 0, amountTotalMinor: 90000, unusedDepositRefundMinor: 0 });
  });
  it.each(["missing", "uncertain", "applied"])("denies first-order %s deposit", (deposit) => {
    expect(() =>
      calculatePilotOrder({
        productSubtotalMinor: 80000,
        deliveryMinor: 0,
        deposit,
        firstOrder: true,
      }),
    ).toThrow();
  });
  it("rejects double-credit, fractions, negative, overflow and injected totals", () => {
    for (const extra of [
      { deposit: "available", firstOrder: false },
      { productSubtotalMinor: -1 },
      { deliveryMinor: 0.5 },
      { productSubtotalMinor: 100000000, deliveryMinor: 100000000 },
      { amountTotalMinor: 1 },
    ]) {
      expect(() =>
        calculatePilotOrder({
          productSubtotalMinor: 80000,
          deliveryMinor: 0,
          deposit: "available",
          firstOrder: true,
          ...extra,
        }),
      ).toThrow();
    }
  });
  it("resolves only current exact server catalogue entries", () => {
    expect(calculateCatalogueSubtotal([price], selection, now)).toBe(150000);
    for (const prices of [
      [],
      [price, price],
      [{ ...price, status: "withdrawn" as const }],
      [{ ...price, expiresAt: now.toISOString() }],
      [{ ...price, effectiveAt: "2026-12-01T00:00:00Z" }],
      [{ ...price, kind: "review_deposit" as const, unitAmountMinor: 99900 }],
    ]) {
      expect(() => calculateCatalogueSubtotal(prices, selection, now)).toThrow();
    }
  });
  it("rejects duplicate, excessive or invalid quantities", () => {
    for (const items of [
      [],
      [...selection, ...selection],
      [{ priceId: price.id, quantity: 11 }],
      [{ priceId: price.id, quantity: 0 }],
      [{ priceId: price.id, quantity: 1.5 }],
    ]) {
      expect(() => calculateCatalogueSubtotal([price], items, now)).toThrow();
    }
  });
  it("rejects client pricing, legacy scenarios and invalid deposit selections", () => {
    const base = {
      caseId: price.id,
      scenario: "approved_product_order",
      items: selection,
      deliveryQuoteId: price.approvalReference,
      requestKey: price.approvalReference,
    };
    expect(pilotOfferSelectionSchema.safeParse(base).success).toBe(true);
    for (const extra of [
      { amountTotalMinor: 1 },
      { paid: true },
      { scenario: "bundle" },
      { items: [] },
      { scenario: "review_deposit" },
      { providerPriceId: "price_fake" },
      { metadata: {} },
    ]) {
      expect(pilotOfferSelectionSchema.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });
  it("fixes the deposit amount and local synthetic provenance", () => {
    expect(
      pilotPriceSchema.safeParse({ ...price, kind: "review_deposit", unitAmountMinor: 99900 })
        .success,
    ).toBe(true);
    expect(
      pilotPriceSchema.safeParse({ ...price, kind: "review_deposit", unitAmountMinor: 90000 })
        .success,
    ).toBe(false);
    expect(pilotPriceSchema.safeParse({ ...price, environment: "production" }).success).toBe(false);
  });
  it("requires every product gate, without requiring products for a deposit", () => {
    expect(() => assertPilotCommerceReadiness(readiness)).not.toThrow();
    for (const key of Object.keys(readiness).filter((key) => key !== "scenario")) {
      expect(() => assertPilotCommerceReadiness({ ...readiness, [key]: false })).toThrow();
    }
    expect(() =>
      assertPilotCommerceReadiness({
        ...readiness,
        scenario: "review_deposit",
        clinicalApproved: false,
        stockConfirmed: false,
        pharmacyAuthorised: false,
        custodyReady: false,
        addressConfirmed: false,
        deliveryCurrent: false,
      }),
    ).not.toThrow();
    expect(() => assertPilotCommerceReadiness({ ...readiness, paid: true })).toThrow();
  });
});
