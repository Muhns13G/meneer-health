import { createFileRoute } from "@tanstack/react-router";

import { AccountCodePage } from "@/components/AccountCodePage";

export const Route = createFileRoute("/account/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <AccountCodePage mode="sign-in" />,
});
