import { expect, it } from "vitest";
import {
  productFulfilmentCommandSchema,
  clientFulfilmentViewSchema,
  nextProductFulfilmentStep,
  productFulfilmentViewSchema,
} from "./product-fulfilment";
import {
  fulfilmentFixtureId as id,
  productFulfilmentFixture,
} from "@/test/product-fulfilment-fixture";
const command = {
  action: "record",
  caseId: id,
  offerId: id,
  expectedVersion: 0,
  event: "provider_ordered",
  evidenceReference: id,
  requestKey: id,
};
it("accepts only an exact reference-based event", () =>
  expect(productFulfilmentCommandSchema.parse(command)).toEqual(command));
it.each(["paid", "approved", "tenantId", "subjectId", "address", "trackingUrl", "medicalAnswers"])(
  "rejects %s",
  (field) =>
    expect(productFulfilmentCommandSchema.safeParse({ ...command, [field]: true }).success).toBe(
      false,
    ),
);
it.each([-1, 0.5, "1"])("rejects invalid version %s", (expectedVersion) =>
  expect(productFulfilmentCommandSchema.safeParse({ ...command, expectedVersion }).success).toBe(
    false,
  ),
);
it("keeps physical stages sequential", () => {
  expect(nextProductFulfilmentStep("not_started")).toBe("provider_ordered");
  expect(nextProductFulfilmentStep("hub_received")).toBe("courier_dispatched");
  expect(nextProductFulfilmentStep("delivered")).toBeNull();
});
it("keeps client projections coarse", () =>
  expect(
    clientFulfilmentViewSchema.safeParse({
      progress: "preparing",
      expiresAt: new Date().toISOString(),
      evidenceReference: id,
    }).success,
  ).toBe(false));
it("rejects impossible next-stage and active-exception projections", () => {
  expect(
    productFulfilmentViewSchema.safeParse({ ...productFulfilmentFixture(), nextEvent: "delivered" })
      .success,
  ).toBe(false);
  expect(
    productFulfilmentViewSchema.safeParse({ ...productFulfilmentFixture(), exception: true })
      .success,
  ).toBe(false);
});
