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
  ...[
    "COMMERCE_REVIEW_MODE",
    "COMMERCE_REVIEW_TENANT_ID",
    "COMMERCE_CHECKOUT_MODE",
    "COMMERCE_WEBHOOK_MODE",
    "COMMERCE_REFUND_MODE",
    "STRIPE_CHECKOUT_ACCOUNT_ID",
  ].map(
    (name): EnvironmentCatalogueEntry => ({
      name,
      purpose:
        "Separate opt-in and scope for private review, sandbox Checkout and signed receipts; no live-payment activation.",
      owner: "Commercial and release owners",
      sensitivity: "public",
      environments: ["local", "production"],
      required: false,
      exposure: "server",
      rotation:
        "Disabled by default; change only for authorised isolated proof or reviewed release.",
    }),
  ),
  {
    name: "MEDICAL_INTAKE_TENANT_ID",
    purpose:
      "Explicit tenant scope for reviewed clinical safety notification dispatch; never inferred from client input.",
    owner: "Clinical and release owners",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation:
      "Change only under reviewed release; isolated fixture binding removed after rehearsal.",
  },
  {
    name: "MEDICAL_INTAKE_MODE",
    purpose:
      "Explicit opt-in for reviewed protected intake; disabled until isolated release proof and domain approval.",
    owner: "Clinical, privacy and release owners",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation:
      "Keep disabled during synthetic-only development; no real tenant activation inferred.",
  },
  {
    name: "MEDICAL_INTAKE_KEYRING_JSON",
    purpose:
      "Dedicated versioned 32-byte AES-GCM medical payload keys, never reused from session, journey or recovery keys.",
    owner: "Medical data and security custodian",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation:
      "Authorised key rotation retains old decryption keys until governed re-encryption and retention complete; never log values.",
  },
  ...["OPERATIONS_ALERTS_MODE", "OPERATIONS_ALERTS_TENANT_ID", "BREVO_API_KEY"].map(
    (name): EnvironmentCatalogueEntry => ({
      name,
      purpose:
        "Opt-in generic internal operations alert delivery; disabled until hosted rehearsal.",
      owner: "Operations and release owner",
      sensitivity: name === "BREVO_API_KEY" ? "secret" : "public",
      environments: ["local", "production"],
      required: false,
      exposure: "server",
      rotation:
        "Review on provider or tenant change; API credentials are distinct from SMTP credentials.",
    }),
  ),
  ...["HANDOFF_INTAKE_URL", "HANDOFF_DESTINATION_ID", "HANDOFF_DESTINATION_VERSION"].map(
    (name): EnvironmentCatalogueEntry => ({
      name,
      purpose:
        "Owner-configured private patient-intake channel; exact digest/version requires separate AAL2 admin approval.",
      owner: "Provider hand-off and release owner",
      sensitivity: name === "HANDOFF_INTAKE_URL" ? "secret" : "public",
      environments: ["local", "production"],
      required: false,
      exposure: "server",
      rotation:
        "Reapprove the recipient and reauthorise clients whenever URL or version changes; never log the link.",
    }),
  ),
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
    name: "JOURNEY_INTENT_ENCRYPTION_KEY_BASE64",
    purpose: "Server-only AES-256-GCM key for encrypted, short-lived treatment-intent state.",
    owner: "Product security and release owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after suspected exposure and invalidate all outstanding intent cookies.",
  },
  {
    name: "IDENTITY_PREACTIVATION_KEY_BASE64",
    purpose: "Server-only AES-256-GCM key for a short-lived, non-authorising invite continuation.",
    owner: "Identity and release owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after suspected exposure; rotation invalidates pending continuation cookies.",
  },
  {
    name: "IDENTITY_SESSION_KEY_BASE64",
    purpose:
      "Server-only AES-256-GCM key for host-only patient sessions; distinct from invite continuation.",
    owner: "Identity and release owner",
    sensitivity: "secret",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Rotate after suspected exposure; rotation invalidates all patient browser sessions.",
  },
  {
    name: "MEASUREMENT_MODE",
    purpose:
      "Server-only exact activation gate for the approved first-party pilot measurement boundary.",
    owner: "Privacy, product, and release owner",
    sensitivity: "public",
    environments: ["local", "production"],
    required: false,
    exposure: "server",
    rotation: "Keep disabled until Task 7.9 and final privacy/security approval pass.",
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
