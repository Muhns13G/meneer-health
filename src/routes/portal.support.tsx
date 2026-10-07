import { createFileRoute } from "@tanstack/react-router";
import { PatientPortalPage } from "@/components/PatientPortalPage";
export const Route = createFileRoute("/portal/support")({
  head: () => ({
    meta: [
      { title: "Support requests — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <PatientPortalPage mode="support" />,
});
