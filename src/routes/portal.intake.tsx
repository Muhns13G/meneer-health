import { createFileRoute } from "@tanstack/react-router";
import { MedicalIntakePage } from "@/components/MedicalIntakePage";
export const Route = createFileRoute("/portal/intake")({
  head: () => ({
    meta: [
      { title: "Your medical questionnaire — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MedicalIntakePage,
});
