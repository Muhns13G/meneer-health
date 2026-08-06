export const CANONICAL_PUBLIC_ORIGIN = "https://meneerhealth.co.za";

export const CAMPAIGNS = {
  dads: {
    id: "dads",
    qrPath: "/campaigns/qr/dads.svg",
    shortPath: "/go/dads",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=dads",
  },
  thanksDad: {
    id: "thanks_dad",
    qrPath: "/campaigns/qr/thanks-dad.svg",
    shortPath: "/go/thanks-dad",
    destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad",
  },
} as const;

export function getCanonicalCampaignUrl(shortPath: string) {
  return `${CANONICAL_PUBLIC_ORIGIN}${shortPath}`;
}
