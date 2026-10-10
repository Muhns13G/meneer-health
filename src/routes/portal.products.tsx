import { createFileRoute } from "@tanstack/react-router";
import { ClientProductsPage } from "@/components/ClientProductsPage";
export const Route = createFileRoute("/portal/products")({
  head: () => ({
    meta: [
      { title: "Private products — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientProductsPage,
});
