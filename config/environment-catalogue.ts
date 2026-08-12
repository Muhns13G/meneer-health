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
    name: "SUPABASE_PUBLISHABLE_KEY",
    purpose: "Runner-only browser-role key for explicit local or hosted synthetic access proofs.",
    owner: "Data and security owner",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Review when the Supabase project or publishable key changes.",
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
    name: "SUPABASE_DB_URL",
    purpose: "Runner-only hosted PostgreSQL connection used to create governed logical exports.",
    owner: "Data and security owner",
    sensitivity: "secret",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure, database password change, or project replacement.",
  },
  {
    name: "RECOVERY_EXPORT_SOURCE",
    purpose: "Runner-only selector that permits synthetic or explicitly gated production exports.",
    owner: "Data and release owner",
    sensitivity: "public",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Select per controlled workflow run; scheduled runs always select production.",
  },
  {
    name: "RECOVERY_R2_BUCKET",
    purpose: "Runner-only name of the private EU R2 encrypted-recovery bucket.",
    owner: "Operations and security owner",
    sensitivity: "public",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Replace only through a tested copy, restore, retention, and cutover procedure.",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    purpose: "Runner-only Cloudflare account identifier used to construct the EU R2 endpoint.",
    owner: "Operations and security owner",
    sensitivity: "public",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Replace when the recovery bucket moves to another Cloudflare account.",
  },
  {
    name: "R2_ACCESS_KEY_ID",
    purpose: "Runner-only S3 access identifier scoped to the private recovery bucket.",
    owner: "Operations and security owner",
    sensitivity: "secret",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure, owner change, or the scheduled annual credential review.",
  },
  {
    name: "R2_SECRET_ACCESS_KEY",
    purpose: "Runner-only S3 secret scoped to the private recovery bucket.",
    owner: "Operations and security owner",
    sensitivity: "secret",
    environments: ["production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure, owner change, or the scheduled annual credential review.",
  },
  {
    name: "RECOVERY_ENCRYPTION_KEY_BASE64",
    purpose: "Runner-only AES-256-GCM key material for encrypted off-site recovery archives.",
    owner: "Security and data owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after suspected exposure and through a tested decrypt/re-encrypt procedure.",
  },
  {
    name: "BACKUP_HEARTBEAT_URL",
    purpose: "Runner-only payload-free Better Stack endpoint called after durable backup write.",
    owner: "Operations and security owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure, monitor replacement, or responder ownership change.",
  },
  {
    name: "STRIPE_RESTRICTED_KEY",
    purpose: "Server-only restricted test key for creating one-time Stripe Checkout Sessions.",
    owner: "Stripe account, commercial, and security owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure, access change, or Stripe account/environment replacement.",
  },
  {
    name: "STRIPE_WEBHOOK_SIGNING_SECRET",
    purpose: "Server-only signing secret for the exact Stripe test webhook endpoint.",
    owner: "Stripe account, commercial, and security owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after exposure or webhook endpoint replacement and reverify signatures.",
  },
  {
    name: "STRIPE_WEBHOOK_SERVICE_IDENTITY_ID",
    purpose: "Server-only identifier for the scoped Stripe webhook service principal.",
    owner: "Stripe account, commercial, and security owner",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Replace when the scoped webhook service identity is replaced or revoked.",
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
