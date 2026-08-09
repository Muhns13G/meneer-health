type PublicEnvironment = Readonly<{
  peptideVideoUrl?: string;
  peptideVideoPosterUrl?: string;
  campaignPrintProof: boolean;
}>;

declare const MENEER_PUBLIC_ENV: PublicEnvironment;

export const publicEnvironment = MENEER_PUBLIC_ENV;
