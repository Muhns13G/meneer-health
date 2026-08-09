import { createFileRoute, redirect } from "@tanstack/react-router";
import { CAMPAIGNS } from "@/lib/campaigns";

export const Route = createFileRoute("/go/thanks-dad")({
  beforeLoad: () => {
    throw redirect({ href: CAMPAIGNS.thanksDad.destination, statusCode: 307 });
  },
});
