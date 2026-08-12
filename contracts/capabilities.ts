import { z } from "zod";

import { platformGenerationSchema } from "./registry";
import { contractMajorSchema, contractNameSchema } from "./shared";

export const capabilityIdSchema = z.string().regex(/^CAP-\d{3}$/);
export const portabilityFixtureIdSchema = z.string().regex(/^PORT-\d{3}$/);

export const contractReferenceSchema = z
  .object({
    name: contractNameSchema,
    version: contractMajorSchema,
  })
  .strict();

export const retainedCapabilitySchema = z
  .object({
    id: capabilityIdSchema,
    name: z.string().min(3),
    owner: z.string().min(3),
    disposition: z.enum(["retained", "intentional-change", "retired"]),
    currentGeneration: z.literal("v1-tanstack"),
    targetGenerations: z.array(platformGenerationSchema),
    surface: z.enum(["public", "sensitive", "server", "operations"]),
    authority: z.string().min(3),
    contractReferences: z.array(contractReferenceSchema),
    acceptanceFixtureIds: z.array(portabilityFixtureIdSchema).min(1),
    activation: z.enum(["active", "inactive-gated", "retired"]),
    rollback: z.enum([
      "route-adapter",
      "provider-adapter",
      "database-forward-repair",
      "configuration",
      "not-applicable",
    ]),
    changeRationale: z.string().min(3).optional(),
  })
  .strict()
  .superRefine((capability, context) => {
    if (
      capability.disposition === "retained" &&
      !capability.targetGenerations.includes("v2-nextjs")
    ) {
      context.addIssue({
        code: "custom",
        message: "Every retained v1 capability must target the v2 generation.",
      });
    }
    if (capability.disposition !== "retained" && !capability.changeRationale) {
      context.addIssue({
        code: "custom",
        message: "Intentional changes and retirements require an explicit rationale.",
      });
    }
    if (capability.disposition === "retired" && capability.activation !== "retired") {
      context.addIssue({
        code: "custom",
        message: "A retired capability cannot remain active or gated.",
      });
    }
  });

export type RetainedCapability = z.infer<typeof retainedCapabilitySchema>;

export const retainedCapabilityCatalogue = [
  {
    id: "CAP-001",
    name: "Approved public site routes and brand content",
    owner: "Product and content boundary",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "public",
    authority: "Version-controlled route content and approved metadata",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-001", "PORT-002"],
    activation: "active",
    rollback: "route-adapter",
  },
  {
    id: "CAP-002",
    name: "Campaign attribution redirects",
    owner: "Campaign boundary",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "public",
    authority: "Canonical server redirect mapping",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-003"],
    activation: "active",
    rollback: "route-adapter",
  },
  {
    id: "CAP-003",
    name: "Fail-closed intake and peptide gates",
    owner: "Product safety boundary",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "sensitive",
    authority: "Server route gate and approved activation evidence",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-004", "PORT-005"],
    activation: "active",
    rollback: "configuration",
  },
  {
    id: "CAP-004",
    name: "Request security and cache classification",
    owner: "Request security boundary",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "Framework-neutral request policy",
    contractReferences: [{ name: "security.request-decision", version: 1 }],
    acceptanceFixtureIds: ["PORT-006"],
    activation: "active",
    rollback: "route-adapter",
  },
  {
    id: "CAP-005",
    name: "Validated workflow command and independent states",
    owner: "Orders and fulfilment module",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "PostgreSQL workflow aggregate and command receipt",
    contractReferences: [
      { name: "workflow.transition", version: 1 },
      { name: "workflow.transitioned", version: 1 },
    ],
    acceptanceFixtureIds: ["PORT-007", "PORT-008"],
    activation: "inactive-gated",
    rollback: "database-forward-repair",
  },
  {
    id: "CAP-006",
    name: "Deny-default contextual authorisation",
    owner: "Identity and access modules",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "Server policy with tenant, purpose, state, relationship and assurance context",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-009"],
    activation: "inactive-gated",
    rollback: "database-forward-repair",
  },
  {
    id: "CAP-007",
    name: "One-time payment and signed reconciliation boundary",
    owner: "Commerce and payments module",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "Payment ledger with verified Stripe evidence",
    contractReferences: [
      { name: "payment.checkout", version: 1 },
      { name: "payment.provider", version: 1 },
    ],
    acceptanceFixtureIds: ["PORT-010", "PORT-011"],
    activation: "inactive-gated",
    rollback: "provider-adapter",
  },
  {
    id: "CAP-008",
    name: "Minimum-data partner fulfilment reconciliation",
    owner: "Orders and fulfilment module",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "Fulfilment ledger with verified partner evidence",
    contractReferences: [{ name: "fulfilment.partner", version: 1 }],
    acceptanceFixtureIds: ["PORT-012", "PORT-013"],
    activation: "inactive-gated",
    rollback: "provider-adapter",
  },
  {
    id: "CAP-009",
    name: "Data-subject and encrypted recovery workflows",
    owner: "Data lifecycle and recovery modules",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "operations",
    authority: "Lifecycle ledger and encrypted recovery artifacts",
    contractReferences: [
      { name: "lifecycle.request", version: 1 },
      { name: "recovery.archive", version: 1 },
      { name: "recovery.manifest", version: 1 },
      { name: "recovery.encrypted-archive", version: 1 },
    ],
    acceptanceFixtureIds: ["PORT-014"],
    activation: "inactive-gated",
    rollback: "database-forward-repair",
  },
  {
    id: "CAP-010",
    name: "Privacy-safe telemetry and stable failures",
    owner: "Operations and application boundaries",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "operations",
    authority: "Canonical telemetry and error contracts",
    contractReferences: [
      { name: "telemetry.event", version: 1 },
      { name: "error.response", version: 1 },
    ],
    acceptanceFixtureIds: ["PORT-015", "PORT-016"],
    activation: "active",
    rollback: "configuration",
  },
  {
    id: "CAP-011",
    name: "Lovable MCP and OAuth application surface",
    owner: "Architecture boundary",
    disposition: "retired",
    currentGeneration: "v1-tanstack",
    targetGenerations: [],
    surface: "public",
    authority: "Ordinary not-found boundary",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-017"],
    activation: "retired",
    rollback: "not-applicable",
    changeRationale: "The unused Lovable-specific application surface was removed in Sprint 2.",
  },
  {
    id: "CAP-012",
    name: "Tenant-scoped provider-neutral persistence",
    owner: "Data and persistence boundary",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "PostgreSQL records behind forced RLS and server-only ports",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-018"],
    activation: "inactive-gated",
    rollback: "database-forward-repair",
  },
  {
    id: "CAP-013",
    name: "Managed identity, sessions and scoped service identities",
    owner: "Identity and access modules",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "server",
    authority: "Stable internal subjects and governed identity/session records",
    contractReferences: [],
    acceptanceFixtureIds: ["PORT-019"],
    activation: "inactive-gated",
    rollback: "provider-adapter",
  },
  {
    id: "CAP-014",
    name: "Append-only audit and integration evidence",
    owner: "Audit, governance and integration modules",
    disposition: "retained",
    currentGeneration: "v1-tanstack",
    targetGenerations: ["v2-nextjs", "v3-laravel-react"],
    surface: "operations",
    authority: "Hash-chained audit facts and transactional inbox/outbox records",
    contractReferences: [
      { name: "audit.fact", version: 1 },
      { name: "integration.received", version: 1 },
    ],
    acceptanceFixtureIds: ["PORT-020"],
    activation: "inactive-gated",
    rollback: "database-forward-repair",
  },
] as const satisfies readonly RetainedCapability[];

const expectedContractSchema = z
  .object({
    accepted: z.boolean(),
    stableErrorCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]+$/)
      .nullable(),
  })
  .strict();

const contractFixtureSchema = z
  .object({
    id: portabilityFixtureIdSchema,
    capabilityId: capabilityIdSchema,
    kind: z.literal("contract-validation"),
    contract: contractReferenceSchema,
    message: z.record(z.string(), z.unknown()),
    expected: expectedContractSchema,
  })
  .strict();

const httpFixtureSchema = z
  .object({
    id: portabilityFixtureIdSchema,
    capabilityId: capabilityIdSchema,
    kind: z.literal("http-boundary"),
    request: z
      .object({
        method: z.enum(["GET", "HEAD", "POST", "OPTIONS"]),
        path: z.string().startsWith("/"),
      })
      .strict(),
    expected: z
      .object({
        status: z.int().min(100).max(599),
        cacheClass: z.enum(["public-revalidate", "private-no-store"]),
        redirect: z.string().startsWith("/").optional(),
        markers: z.array(z.string()),
        absentMarkers: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

const behaviouralScenarioFixtureSchema = z
  .object({
    id: portabilityFixtureIdSchema,
    capabilityId: capabilityIdSchema,
    kind: z.literal("behavioural-scenario"),
    scenario: z.string().regex(/^[a-z][a-z0-9-]+$/),
    input: z.record(z.string(), z.unknown()),
    expected: z.record(z.string(), z.unknown()),
    currentEvidence: z.array(z.string().regex(/^[a-z0-9_./-]+\.test\.(?:ts|tsx|sql)$/)).min(1),
  })
  .strict();

export const portabilityFixtureSchema = z.discriminatedUnion("kind", [
  contractFixtureSchema,
  httpFixtureSchema,
  behaviouralScenarioFixtureSchema,
]);

export const portabilityFixtureCatalogueSchema = z
  .object({
    revision: z.int().positive(),
    generatedFrom: z.literal("v1-tanstack"),
    fixtures: z.array(portabilityFixtureSchema).min(1),
  })
  .strict();

export type PortabilityFixture = z.infer<typeof portabilityFixtureSchema>;

export function comparePortableObservation(expected: unknown, observed: unknown): string[] {
  const canonicalise = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalise);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, canonicalise(child)]),
      );
    }
    return value;
  };

  return JSON.stringify(canonicalise(expected)) === JSON.stringify(canonicalise(observed))
    ? []
    : ["BEHAVIOURAL_MISMATCH"];
}
