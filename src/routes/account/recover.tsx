import { createFileRoute } from "@tanstack/react-router";

import { AccountCodePage } from "@/components/AccountCodePage";

export const Route = createFileRoute("/account/recover")({
  head: () => ({
    meta: [
      { title: "Recover your account — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <AccountCodePage mode="recover" />,
});
