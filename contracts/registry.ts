import { z } from "zod";

import {
  auditFactContract,
  integrationInboxContract,
  workflowTransitionedEventContract,
} from "./audit";
import { contractDefinitionSchema } from "./catalogue";
import { errorResponseContract } from "./errors";
import { fulfilmentPartnerEventContract } from "./fulfilment";
import {
  dataSubjectRequestContract,
  encryptedRecoveryArchiveContract,
  recoveryArchiveContract,
  recoveryManifestContract,
} from "./lifecycle";
import { measurementConsentContract, measurementEventContract } from "./measurement";
import { telemetryEventContract } from "./observability";
import { paymentCheckoutContract, paymentProviderEventContract } from "./payments";
import { publicClaimRegisterContract } from "./public-claims";
import { publicContentCatalogueContract } from "./public-content";
import { requestSecurityDecisionContract } from "./security";
import { workflowTransitionContract } from "./workflows";

export const platformGenerationSchema = z.enum(["v1-tanstack", "v2-nextjs", "v3-laravel-react"]);

export const migrationVersionSchema = z.string().regex(/^\d{14}$/);

export const contractSchemaRegistryEntrySchema = z
  .object({
    definition: contractDefinitionSchema,
    schemaExport: z.string().regex(/^[A-Za-z][A-Za-z0-9]*Schema$/),
    source: z.string().regex(/^contracts\/[a-z0-9-]+\.ts$/),
    databaseMigration: migrationVersionSchema.nullable(),
    supportedGenerations: z.array(platformGenerationSchema).min(2),
    compatibility: z.literal("strict-major"),
  })
  .strict();

export type ContractSchemaRegistryEntry = z.infer<typeof contractSchemaRegistryEntrySchema>;

const allGenerations = ["v1-tanstack", "v2-nextjs", "v3-laravel-react"] as const;

export const contractSchemaRegistry = [
  {
    definition: measurementConsentContract,
    schemaExport: "measurementConsentCommandSchema",
    source: "contracts/measurement.ts",
    databaseMigration: "20260813193459",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: measurementEventContract,
    schemaExport: "measurementEventSchema",
    source: "contracts/measurement.ts",
    databaseMigration: "20260813193459",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: publicClaimRegisterContract,
    schemaExport: "publicClaimRegisterSchema",
    source: "contracts/public-claims.ts",
    databaseMigration: null,
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: publicContentCatalogueContract,
    schemaExport: "publicContentCatalogueSchema",
    source: "contracts/public-content.ts",
    databaseMigration: null,
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: errorResponseContract,
    schemaExport: "errorContractSchema",
    source: "contracts/errors.ts",
    databaseMigration: null,
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: requestSecurityDecisionContract,
    schemaExport: "requestSecurityDecisionSchema",
    source: "contracts/security.ts",
    databaseMigration: "20260810214446",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: workflowTransitionContract,
    schemaExport: "workflowTransitionCommandSchema",
    source: "contracts/workflows.ts",
    databaseMigration: "20260810191749",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: workflowTransitionedEventContract,
    schemaExport: "workflowTransitionedEventSchema",
    source: "contracts/audit.ts",
    databaseMigration: "20260810200633",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: auditFactContract,
    schemaExport: "auditFactSchema",
    source: "contracts/audit.ts",
    databaseMigration: "20260810200633",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: integrationInboxContract,
    schemaExport: "integrationInboxReceiptSchema",
    source: "contracts/audit.ts",
    databaseMigration: "20260810200633",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: telemetryEventContract,
    schemaExport: "telemetryEventSchema",
    source: "contracts/observability.ts",
    databaseMigration: "20260810214446",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: dataSubjectRequestContract,
    schemaExport: "dataSubjectRequestCommandSchema",
    source: "contracts/lifecycle.ts",
    databaseMigration: "20260810222608",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: recoveryManifestContract,
    schemaExport: "recoveryManifestSchema",
    source: "contracts/lifecycle.ts",
    databaseMigration: "20260810222608",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: encryptedRecoveryArchiveContract,
    schemaExport: "encryptedRecoveryArchiveSchema",
    source: "contracts/lifecycle.ts",
    databaseMigration: "20260810222608",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: recoveryArchiveContract,
    schemaExport: "recoveryArchiveReferenceSchema",
    source: "contracts/lifecycle.ts",
    databaseMigration: "20260810222608",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: paymentCheckoutContract,
    schemaExport: "paymentCheckoutCommandSchema",
    source: "contracts/payments.ts",
    databaseMigration: "20260810231243",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: paymentProviderEventContract,
    schemaExport: "verifiedPaymentProviderEventSchema",
    source: "contracts/payments.ts",
    databaseMigration: "20260810231243",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
  {
    definition: fulfilmentPartnerEventContract,
    schemaExport: "verifiedFulfilmentPartnerEventSchema",
    source: "contracts/fulfilment.ts",
    databaseMigration: "20260811113146",
    supportedGenerations: allGenerations,
    compatibility: "strict-major",
  },
] as const;

export const supportedContractMajors = Object.freeze(
  Object.fromEntries(
    contractSchemaRegistry.map((entry) => [entry.definition.name, [entry.definition.version]]),
  ),
);
