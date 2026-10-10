export const quoteFixtureId = "15400000-0000-4000-8000-000000000001";
export function staffQuoteFixture() {
  return {
    caseId: quoteFixtureId,
    caseVersion: 1,
    tenantName: "Synthetic workspace",
    catalogueId: quoteFixtureId,
    synthetic: true,
    items: [
      {
        productId: quoteFixtureId,
        description: "Synthetic item",
        unitAmountMinor: 150000,
        maxQuantity: 2,
        interested: true,
      },
    ],
    deliveries: [
      { deliveryQuoteId: quoteFixtureId, addressSnapshotId: quoteFixtureId, amountMinor: 10000 },
    ],
    draft: null,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  };
}
