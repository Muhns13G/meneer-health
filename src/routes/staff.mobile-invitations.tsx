import { createFileRoute } from "@tanstack/react-router";
import { StaffMobileInvitationsPage } from "@/components/StaffMobileInvitationsPage";

export const Route = createFileRoute("/staff/mobile-invitations")({
  head: () => ({
    meta: [
      { title: "Mobile pilot invitations — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: StaffMobileInvitationsPage,
});
