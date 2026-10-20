import { createFileRoute } from "@tanstack/react-router";
import { AccountDocumentsPage } from "@/components/AccountDocumentsPage";

export const Route = createFileRoute("/account/documents")({
  head: () => ({
    meta: [
      { title: "Review your account documents — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountDocumentsPage,
});
