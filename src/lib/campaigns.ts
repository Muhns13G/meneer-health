import { publicContent } from "@content/public-content";
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";

export const CAMPAIGNS = publicContent.campaigns;

export function getCanonicalCampaignUrl(shortPath: string) {
  return getCanonicalPublicUrl(shortPath);
}
