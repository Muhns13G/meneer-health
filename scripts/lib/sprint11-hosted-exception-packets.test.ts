import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const packets = [
  "sprint-11-refund-fault-rollback",
  "sprint-11-independence-rollback",
  "sprint-11-late-attempt-rollback",
];

it.each(packets)("keeps %s isolated, rollback-only and explicitly synthetic", (name) => {
  const sql = readFileSync(`scripts/sql/${name}.sql`, "utf8").trim();
  expect(sql).toMatch(/\bbegin;/i);
  expect(sql).toMatch(/rollback;$/i);
  expect(sql).not.toMatch(/\bcommit;|disable trigger|alter table|truncate|delete from|grant\b/i);
  expect(sql).toContain("e1191000-0000-4000-8000-000000000001");
  expect(sql).not.toContain("meneer-pilot");
  expect(sql).toMatch(/NOT (Stripe|a second real provider)|No real clinical/);
});

it("exercises uncertain/pending denials and one verified-failure retry through the public wrapper", () => {
  const sql = readFileSync("scripts/sql/sprint-11-refund-fault-rollback.sql", "utf8");
  expect(sql).toContain("public.staff_refund_command");
  expect(sql).toContain("public.apply_pilot_provider_event");
  // SQL-language function parameters must not collide with the joined job's state column.
  expect(sql).toContain("provider_status text");
  expect(sql).toContain("'refundStatus',provider_status");
  for (const guard of [
    "UNCERTAIN_RETRY_ALLOWED",
    "PENDING_RETRY_ALLOWED",
    "FAILURE_NOT_VERIFIED",
    "RETRY_NOT_BOUNDED",
    "RETRY_RETAINED_BOUNDARY_FAILED",
  ])
    expect(sql).toContain(guard);
});

it("rejects a noninteractive operator run before creating hosted fixtures", () => {
  const source = readFileSync("scripts/test-hosted-pilot-journey.ts", "utf8");
  expect(source).toContain('invariant(process.stdin.isTTY, "INTERACTIVE_TERMINAL_REQUIRED")');
  expect(source.indexOf("INTERACTIVE_TERMINAL_REQUIRED")).toBeLessThan(
    source.indexOf('"AUTH_CREATE_FAILED"'),
  );
  expect(source).toContain("refund = await stripe.refunds.retrieve(refund.id)");
});

it("fingerprints protected state and tests both approved refund reasons without clinical release", () => {
  const sql = readFileSync("scripts/sql/sprint-11-independence-rollback.sql", "utf8");
  expect(sql).toContain("array['unsuitable','failed_handoff']");
  expect(sql).toContain("FINANCIAL_REVIEW_CHANGED_PROTECTED_STATE");
  expect(sql).toContain("S11_REASON_ROLLBACK");
  expect(sql).toContain("UNAPPROVED_PRODUCT_ALLOWED");
});

it("requires an expired linked original, one retained funding record and no supply", () => {
  const sql = readFileSync("scripts/sql/sprint-11-late-attempt-rollback.sql", "utf8");
  expect(sql).toContain("settlements(intent_id,expiry_seen) values(intent,true)");
  expect(sql).toContain("commerce_private.deposit_attempt_links");
  expect(sql).toContain("LATE_CAPTURE_NOT_QUARANTINED");
  expect(sql).toContain("funding_once");
  expect(sql).toContain("public.fulfilment_cases");
});
