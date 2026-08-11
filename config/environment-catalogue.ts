export type EnvironmentName = "local" | "preview" | "production";
export type EnvironmentExposure = "client" | "server";
export type EnvironmentSensitivity = "public" | "secret";

export type EnvironmentCatalogueEntry = {
  name: string;
  purpose: string;
  owner: string;
  sensitivity: EnvironmentSensitivity;
  environments: readonly EnvironmentName[];
  required: boolean;
  exposure: EnvironmentExposure;
  rotation: string;
};

export const environmentCatalogue: readonly EnvironmentCatalogueEntry[] = [
  {
    name: "SUPABASE_URL",
    purpose:
      "Server-only endpoint for the selected Supabase PostgreSQL and managed identity adapters.",
    owner: "Data and release owner",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Review when the project or environment changes.",
  },
  {
    name: "SUPABASE_SECRET_KEY",
    purpose:
      "Server-only credential for the Supabase persistence and identity administration adapters.",
    owner: "Data and security owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after suspected exposure, role change, or project replacement.",
  },
  {
    name: "VITE_PEPTIDE_VIDEO_URL",
    purpose: "Optional root-relative or HTTPS URL for the draft peptide explainer video.",
    owner: "Content and release owner",
    sensitivity: "public",
    environments: ["local", "preview", "production"],
    required: false,
    exposure: "client",
    rotation: "Review and replace when the approved media asset or delivery location changes.",
  },
  {
    name: "VITE_PEPTIDE_VIDEO_POSTER_URL",
    purpose: "Optional root-relative or HTTPS poster image for the draft peptide explainer video.",
    owner: "Content and release owner",
    sensitivity: "public",
    environments: ["local", "preview", "production"],
    required: false,
    exposure: "client",
    rotation: "Review and replace with the associated approved media release.",
  },
  {
    name: "VITE_CAMPAIGN_PRINT_PROOF",
    purpose: "Enables internal campaign print proofs when set to the exact string true.",
    owner: "Campaign and release owner",
    sensitivity: "public",
    environments: ["local", "preview", "production"],
    required: false,
    exposure: "client",
    rotation: "Set to false immediately after an approved print-proof session.",
  },
] as const;

export const serverEnvironmentNames = environmentCatalogue
  .filter((entry) => entry.exposure === "server")
  .map((entry) => entry.name);
