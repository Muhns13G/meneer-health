import { createFileRoute } from "@tanstack/react-router";
import { StaffAlertsPage } from "@/components/StaffAlertsPage";
export const Route = createFileRoute("/staff/alerts")({
  head: () => ({
    meta: [
      { title: "Operations alert review — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: StaffAlertsPage,
});
