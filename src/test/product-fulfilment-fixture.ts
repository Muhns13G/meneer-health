import type { ProductFulfilmentView } from "@/domain/payments/product-fulfilment";
export const fulfilmentFixtureId = "15700000-0000-4000-8000-000000000001";
export function productFulfilmentFixture(): ProductFulfilmentView {
  return {
    caseId: fulfilmentFixtureId,
    offerId: fulfilmentFixtureId,
    version: 0,
    tenantName: "Synthetic workspace",
    synthetic: true,
    stage: "not_started",
    exception: false,
    nextEvent: "provider_ordered",
    canAdvance: true,
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  };
}
