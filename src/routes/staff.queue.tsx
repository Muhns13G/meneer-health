import { createFileRoute } from "@tanstack/react-router";
import { StaffQueuePage } from "@/components/StaffQueuePage";

export const Route = createFileRoute("/staff/queue")({
  head: () => ({
    meta: [
      { title: "Assigned operations queue — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: StaffQueuePage,
});
