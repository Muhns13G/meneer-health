import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const setup = readFileSync("scripts/sql/sprint-13-payment-setup.sql", "utf8");

describe("Sprint 13.4 deposit-only fixture boundary", () => {
  it("requires a suspended real pilot and an empty five-identity isolated baseline", () => {
    expect(setup).toContain("(select count(*) from auth.users)<>5");
    expect(setup).toContain("status='suspended'");
    expect(setup).toContain("SPRINT13_PAYMENT_BASELINE_CHANGED");
    expect(setup).toContain("SYNTHETIC DEPOSIT ONLY");
    expect(setup).not.toContain("e1191000");
  });

  it("does not invent payment, assignments, claims or product-release facts", () => {
    for (const relation of [
      "deposit_funding",
      "settlements",
      "provider_receipts",
      "receipt_applications",
      "checkout_intents",
      "operations_assignments",
      "operations_claims",
      "product_release_gates",
      "refund_authorities",
    ]) {
      expect(setup).not.toMatch(new RegExp(`insert\\s+into\\s+\\w+\\.${relation}\\b`, "i"));
    }
    expect(setup).toContain("99900");
    expect(setup).toContain("acct_1U32UbFfj16Nnr1i");
    expect(setup).not.toContain("approved_product_order");
  });

  it("labels synthetic intake and generated contact prerequisites honestly", () => {
    expect(setup).toContain("NOT fresh email-delivery evidence");
    expect(setup).toContain("not medical submission/UI/encryption evidence");
    expect(setup).toContain("public.activate_pilot_account");
    expect(setup).toContain("{{providerSession}}");
    expect(setup).not.toMatch(/disable trigger|truncate|grant execute|alter table/i);
  });
});
