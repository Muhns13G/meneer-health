import { createFileRoute } from "@tanstack/react-router";
import { PatientPortalPage } from "@/components/PatientPortalPage";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [{ title: "Your account — Meneer" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PortalPage,
});
function PortalPage() {
  return <PatientPortalPage mode="overview" />;
}
