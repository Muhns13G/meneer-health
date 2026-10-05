import { createFileRoute } from "@tanstack/react-router";
import { MedicalWorkPage } from "@/components/MedicalWorkPage";
export const Route = createFileRoute("/staff/intake")({
  head: () => ({
    meta: [
      { title: "Private medical work — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MedicalWorkPage,
});
