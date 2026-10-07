import { createFileRoute } from "@tanstack/react-router";
import { WorkforceSignInPage } from "@/components/WorkforceSignInPage";

export const Route = createFileRoute("/staff/sign-in")({
  head: () => ({
    meta: [
      { title: "Staff sign-in — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: WorkforceSignInPage,
});
