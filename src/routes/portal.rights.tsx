import { createFileRoute } from "@tanstack/react-router";
import { PatientPortalPage } from "@/components/PatientPortalPage";

export const Route = createFileRoute("/portal/rights")({
  head: () => ({
    meta: [
      { title: "Account and data requests — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RightsPage,
});
function RightsPage() {
  return <PatientPortalPage mode="rights" />;
}
