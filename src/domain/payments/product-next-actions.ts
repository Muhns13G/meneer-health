import type { ProductFulfilmentView } from "./product-fulfilment";
import type { PaymentStatusPage } from "./payment-status";

// Presentation only: these messages never grant payment, clinical or supply authority.
export const clientDeliveryActions = {
  not_started: "The team has not recorded preparation yet. No delivery date is confirmed.",
  preparing: "The team is preparing your order. No action is needed from you right now.",
  received: "Your order has reached Meneer. Wait for dispatch confirmation here.",
  dispatched:
    "Your order is with the courier. If it does not arrive as arranged, request secure support.",
  delivered:
    "Delivery has been recorded. If anything is missing or damaged, request secure support.",
  needs_review:
    "The team needs to review this order. Request secure support; do not place or pay for a replacement yourself.",
} as const;

export function staffSupplyNextAction(view: ProductFulfilmentView): string {
  if (!view.offerId) return "No issued product quote is available. Review quote preparation first.";
  if (view.exception)
    return "Review the recorded exception and private evidence before recording its resolution. Resolution does not advance delivery.";
  if (!view.nextEvent)
    return "Delivery is recorded. Use an exception for a return, recall, damage or missing parcel; do not start a replacement automatically.";
  if (!view.canAdvance)
    return "Progression is blocked. Refresh payment and approval evidence, check holds and current access; do not repeat a physical action to clear this block.";
  const actions = {
    provider_ordered:
      "Check the exact paid quote and current approvals, then record the actual provider order using its private evidence reference.",
    pharmacy_released:
      "Wait for the pharmacy's actual release evidence. Payment alone does not authorise dispensing.",
    hub_received:
      "Confirm actual receipt at Meneer and its private custody evidence before recording receipt.",
    courier_dispatched:
      "Confirm the agreed address, courier handover and private dispatch evidence before recording dispatch.",
    delivered:
      "Confirm actual delivery evidence before recording delivery. Record an exception if delivery failed.",
  } as const;
  return actions[view.nextEvent];
}

export function paymentNextAction(payment: PaymentStatusPage["payments"][number]): string {
  if (payment.requiresReview || payment.dispute || payment.refundedMinor > 0)
    return "Staff review is needed. Do not pay again or assume a refund is complete; use secure support for help.";
  switch (payment.status) {
    case "pending":
      return "Confirmation is pending. Refresh status before doing anything else; do not start another payment.";
    case "confirmed":
    case "not_required":
      return "No further payment is needed for this transaction. Check your order progress for the next step; payment does not confirm product supply.";
    case "failed":
    case "expired":
      return "Return to the exact order and reload it before checking whether Checkout is available. Do not reuse an old payment link.";
    case "not_started":
      return "Open your current order to review its exact terms and available payment action.";
  }
}
