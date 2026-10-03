import { createFileRoute } from "@tanstack/react-router";
import { PatientPortalPage } from "@/components/PatientPortalPage";

export const Route = createFileRoute("/portal/profile")({
  head: () => ({
    meta: [{ title: "Your profile — Meneer" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ProfilePage,
});
function ProfilePage() {
  return <PatientPortalPage mode="profile" />;
}
