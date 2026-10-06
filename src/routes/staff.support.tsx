import { createFileRoute } from "@tanstack/react-router";
import { StaffSupportPage } from "@/components/StaffSupportPage";
export const Route = createFileRoute("/staff/support")({
  head: () => ({
    meta: [
      { title: "Support and delivery follow-up — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: StaffSupportPage,
});
