import type { z } from "zod";

import {
  auditFactSchema,
  integrationInboxReceiptSchema,
  workflowTransitionedEventSchema,
} from "./audit";
import type { PortabilityFixture } from "./capabilities";
import { errorContractSchema } from "./errors";
import { verifiedFulfilmentPartnerEventSchema } from "./fulfilment";
import {
  dataSubjectRequestCommandSchema,
  encryptedRecoveryArchiveSchema,
  recoveryArchiveReferenceSchema,
  recoveryManifestSchema,
} from "./lifecycle";
import { telemetryEventSchema } from "./observability";
import { paymentCheckoutCommandSchema, verifiedPaymentProviderEventSchema } from "./payments";
import { contractSchemaRegistry, supportedContractMajors } from "./registry";
import { requestSecurityDecisionSchema } from "./security";
import { supportsContractMajor } from "./versioning";
import { workflowTransitionCommandSchema } from "./workflows";

const registeredSchemas: Readonly<Record<string, z.ZodType>> = {
  "audit.fact": auditFactSchema,
  "error.response": errorContractSchema,
  "fulfilment.partner": verifiedFulfilmentPartnerEventSchema,
  "integration.received": integrationInboxReceiptSchema,
  "lifecycle.request": dataSubjectRequestCommandSchema,
  "payment.checkout": paymentCheckoutCommandSchema,
  "payment.provider": verifiedPaymentProviderEventSchema,
  "recovery.archive": recoveryArchiveReferenceSchema,
  "recovery.encrypted-archive": encryptedRecoveryArchiveSchema,
  "recovery.manifest": recoveryManifestSchema,
  "security.request-decision": requestSecurityDecisionSchema,
  "telemetry.event": telemetryEventSchema,
  "workflow.transition": workflowTransitionCommandSchema,
  "workflow.transitioned": workflowTransitionedEventSchema,
};

export type ContractFixtureObservation = {
  accepted: boolean;
  stableErrorCode: string | null;
};

export function validatePortableContractFixture(
  fixture: Extract<PortabilityFixture, { kind: "contract-validation" }>,
): ContractFixtureObservation {
  const messageContract = fixture.message.contract;
  const messageVersion = fixture.message.version;

  if (messageContract !== fixture.contract.name || typeof messageVersion !== "number") {
    return { accepted: false, stableErrorCode: "VALIDATION_FAILED" };
  }
  if (!supportsContractMajor(supportedContractMajors, messageContract, messageVersion)) {
    return { accepted: false, stableErrorCode: "UNSUPPORTED_CONTRACT_MAJOR" };
  }

  const schema = registeredSchemas[fixture.contract.name];
  if (!schema) return { accepted: false, stableErrorCode: "INTERNAL_FAILURE" };

  return schema.safeParse(fixture.message).success
    ? { accepted: true, stableErrorCode: null }
    : { accepted: false, stableErrorCode: "VALIDATION_FAILED" };
}

export function registeredSchemaNames(): readonly string[] {
  return Object.freeze(Object.keys(registeredSchemas).sort());
}

export function registeredCatalogueNames(): readonly string[] {
  return Object.freeze(contractSchemaRegistry.map((entry) => entry.definition.name).sort());
}
