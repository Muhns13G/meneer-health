import { createFileRoute, redirect } from "@tanstack/react-router";
import { CAMPAIGNS } from "@/lib/campaigns";

export const Route = createFileRoute("/go/dads")({
  beforeLoad: () => {
    throw redirect({ href: CAMPAIGNS.dads.destination, statusCode: 307 });
  },
});
