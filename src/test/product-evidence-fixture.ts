import type { ProductEvidenceView } from "@/domain/payments/product-quote-evidence";
export const evidenceFixtureId = "15500000-0000-4000-8000-000000000001";
export function productEvidenceFixture(
  role: "operations" | "clinician" = "operations",
): ProductEvidenceView {
  return {
    draftId: evidenceFixtureId,
    version: 1,
    tenantName: "Synthetic workspace",
    synthetic: true,
    role,
    canRecord: true,
    items: [{ description: "Synthetic item", quantity: 2 }],
    evidence: [],
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    recordUntil: new Date(Date.now() + 12 * 3600000).toISOString(),
  };
}
