import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const setup = readFileSync("scripts/sql/sprint-13-payment-setup.sql", "utf8");
const driver = readFileSync("scripts/test-sprint13-hosted-payment.ts", "utf8");

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
  it("requires fresh interactive sandbox and approved disabled-restoration guards", () => {
    for (const guard of [
      "process.stdin.isTTY",
      "!process.env.CI",
      "rk_test_",
      "isolated-deposit-capture-refund-only",
      "saved-stripe-disabled-suspended-pilot",
      "OUTBOUND_ALERTS_NOT_PROVEN_DISABLED",
      "CONCURRENT_DEPLOYMENT_CHANGED",
    ]) {
      expect(driver).toContain(guard);
    }
    expect(driver).not.toContain("e1191000");
    expect(driver).not.toContain("wrangler deploy");
    expect(driver).not.toContain("generateTestHeaderString");
  });

  it("proves actual capture and signed funding before paid-review success", () => {
    for (const proof of [
      'payment_status === "paid"',
      "GENUINE_SIGNED_FUNDING_MISSING",
      "checkout.session.completed",
      "OPAQUE_CHECKOUT_LINEAGE_INVALID",
      "SETTLED_PROJECTION_FACTS_INVALID",
      "QUEUE_STALE_CONFLICT_FAILED",
      "QUEUE_CHANGED_REPLAY_CONFLICT_FAILED",
      "QUEUE_CONFLICT_STATE_CHANGED",
    ]) {
      expect(driver).toContain(proof);
    }
    expect(driver).not.toContain("approved_product_order");
    expect(driver).not.toContain("/staff/queue/handoff");
  });

  it("keeps an exact private manifest and fails cleanup closed on uncertainty", () => {
    for (const proof of [
      "mode: 0o600",
      "sprint-13-onboarding-cleanup",
      "PAYMENT_RECONCILIATION_REQUIRED",
      "CLEANUP_REFUND_UNCONFIRMED",
      "BASELINE_RESTORE_FAILED",
      "TRIGGER_RESTORE_FAILED",
      "COMMERCE_REVIEW_TENANT_ID: realPilot",
      "STRIPE_WEBHOOK_SIGNING_SECRET: savedSigningSecret",
    ]) {
      expect(driver).toContain(proof);
    }
    const cleanup = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8");
    expect(cleanup).toContain(
      "t.tgrelid='commerce_private.checkout_intents'::regclass and t.tgname='checkout_intents_guard'",
    );
    expect(cleanup).toContain("lock table %s in access exclusive mode");
    expect(cleanup).toContain("ONBOARDING_TRIGGER_RESTORE_FAILED");
  });
});
