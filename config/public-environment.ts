import { z } from "zod";

import { environmentCatalogue } from "./environment-catalogue";

const publicEnvironmentNames = environmentCatalogue
  .filter((entry) => entry.exposure === "client")
  .map((entry) => entry.name);

const optionalMediaUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .refine((value) => {
      if (value.startsWith("/") && !value.startsWith("//")) {
        return true;
      }

      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Media URLs must be root-relative or use HTTPS.")
    .optional(),
);

const publicBuildEnvironmentSchema = z
  .object({
    VITE_PEPTIDE_VIDEO_URL: optionalMediaUrlSchema,
    VITE_PEPTIDE_VIDEO_POSTER_URL: optionalMediaUrlSchema,
    VITE_CAMPAIGN_PRINT_PROOF: z.enum(["true", "false"]).optional().default("false"),
  })
  .strict();

export class PublicEnvironmentConfigurationError extends Error {
  readonly code = "PUBLIC_ENVIRONMENT_INVALID";

  constructor() {
    super("Public build configuration is invalid.");
    this.name = "PublicEnvironmentConfigurationError";
  }
}

export type PublicEnvironment = {
  peptideVideoUrl?: string;
  peptideVideoPosterUrl?: string;
  campaignPrintProof: boolean;
};

export function validatePublicBuildEnvironment(
  environment: Record<string, string | boolean | undefined>,
): PublicEnvironment {
  const viteEnvironment = Object.fromEntries(
    Object.entries(environment).filter(([name]) => name.startsWith("VITE_")),
  );
  const result = publicBuildEnvironmentSchema.safeParse(viteEnvironment);

  if (!result.success) {
    throw new PublicEnvironmentConfigurationError();
  }

  const unknownCatalogueName = publicEnvironmentNames.find(
    (name) => !(name in publicBuildEnvironmentSchema.shape),
  );

  if (unknownCatalogueName) {
    throw new PublicEnvironmentConfigurationError();
  }

  return Object.freeze({
    peptideVideoUrl: result.data.VITE_PEPTIDE_VIDEO_URL,
    peptideVideoPosterUrl: result.data.VITE_PEPTIDE_VIDEO_POSTER_URL,
    campaignPrintProof: result.data.VITE_CAMPAIGN_PRINT_PROOF === "true",
  });
}
