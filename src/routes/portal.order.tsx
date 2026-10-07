import { createFileRoute } from "@tanstack/react-router";
import { OrderReviewPage } from "@/components/OrderReviewPage";
export const Route = createFileRoute("/portal/order")({
  head: () => ({
    meta: [
      { title: "Review your order — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderReviewPage,
});
