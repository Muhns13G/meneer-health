import { expect, it } from "vitest";
import {
  clientDeliveryActions,
  paymentNextAction,
  staffSupplyNextAction,
} from "./product-next-actions";
import { productFulfilmentFixture } from "@/test/product-fulfilment-fixture";
import type { PaymentStatusPage } from "./payment-status";

it("covers every coarse client delivery stage without sensitive values or fulfilment promises", () => {
  expect(Object.keys(clientDeliveryActions)).toEqual([
    "not_started",
    "preparing",
    "received",
    "dispatched",
    "delivered",
    "needs_review",
  ]);
  expect(clientDeliveryActions.not_started).toContain("No delivery date is confirmed");
  expect(clientDeliveryActions.needs_review).toContain("do not place or pay");
  expect(JSON.stringify(clientDeliveryActions)).not.toMatch(
    /https?:|tracking|peptide|steroid|R999/,
  );
});
it("prioritises exact staff exception and blocked states over physical progression", () => {
  const view = productFulfilmentFixture();
  expect(staffSupplyNextAction({ ...view, offerId: null })).toContain("No issued product quote");
  expect(staffSupplyNextAction({ ...view, exception: true, canAdvance: false })).toContain(
    "Resolution does not advance",
  );
  expect(staffSupplyNextAction({ ...view, canAdvance: false })).toContain("Progression is blocked");
  expect(staffSupplyNextAction({ ...view, stage: "delivered", nextEvent: null })).toContain(
    "do not start a replacement",
  );
  for (const nextEvent of [
    "provider_ordered",
    "pharmacy_released",
    "hub_received",
    "courier_dispatched",
    "delivered",
  ] as const)
    expect(staffSupplyNextAction({ ...view, nextEvent })).not.toBeUndefined();
});
it("never recommends duplicate payment for pending, refunded, disputed or uncertain evidence", () => {
  const payment = {
    status: "pending",
    requiresReview: false,
    dispute: false,
    refundedMinor: 0,
  } as PaymentStatusPage["payments"][number];
  expect(paymentNextAction(payment)).toContain("do not start another payment");
  for (const change of [{ requiresReview: true }, { dispute: true }, { refundedMinor: 100 }])
    expect(paymentNextAction({ ...payment, ...change })).toContain("Do not pay again");
  for (const status of ["confirmed", "not_required"] as const)
    expect(paymentNextAction({ ...payment, status })).toContain("No further payment");
  for (const status of ["expired", "failed"] as const)
    expect(paymentNextAction({ ...payment, status })).toContain("Do not reuse an old payment link");
  expect(paymentNextAction({ ...payment, status: "not_started" })).toContain("current order");
});
