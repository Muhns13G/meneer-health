export function clientProductsFixture() {
  return {
    catalogueId: "15300000-0000-4000-8000-000000000001",
    version: "synthetic-v1",
    synthetic: true,
    items: [
      {
        productId: "15300000-0000-4000-8000-000000000002",
        description: "Synthetic item one",
        unitAmountMinor: 150000,
        currency: "zar",
        interested: false,
      },
    ],
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  };
}
