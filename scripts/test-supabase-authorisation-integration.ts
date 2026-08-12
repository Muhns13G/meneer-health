import { createClient } from "@supabase/supabase-js";

import { AuthorisationService } from "../src/application/authorisation/authorisation-service";
import { SupabaseAuthorisationContextRepository } from "../src/adapters/identity/supabase/supabase-authorisation-context-repository";
import {
  resolveServerAuthorisationResource,
  type AuthorisationRequest,
} from "../src/domain/access/authorisation";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

const alphaTenant = "10000000-0000-4000-8000-000000000001";
const betaTenant = "10000000-0000-4000-8000-000000000002";
const patientSubject = "20000000-0000-4000-8000-000000000001";
const patientProviderSession = "71000000-0000-4000-8000-000000000001";
const operationsProviderSession = "71000000-0000-4000-8000-000000000002";
const assignedFulfilment = "a0000000-0000-4000-8000-000000000002";
const observedAt = new Date("2030-01-01T00:10:00Z");

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(
  tenantId: string,
  type: AuthorisationRequest["resource"]["type"],
  id: string,
  purpose: AuthorisationRequest["purpose"],
  action: AuthorisationRequest["action"],
  ownerSubjectId?: string,
): AuthorisationRequest {
  return {
    action,
    purpose,
    observedAt,
    resource: resolveServerAuthorisationResource({
      tenantId,
      type,
      id,
      workflowState: "active",
      restriction: "none",
      allowedPurposes: [purpose],
      ...(ownerSubjectId ? { ownerSubjectId } : {}),
    }),
  };
}

async function run(): Promise<void> {
  const status = readSupabaseIntegrationEnvironment();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);

  const { error: sessionError } = await serverClient.from("identity_sessions").upsert({
    id: "70000000-0000-4000-8000-000000000002",
    subject_id: "20000000-0000-4000-8000-000000000002",
    provider_session_id: operationsProviderSession,
    session_class: "workforce",
    assurance: "aal2",
    status: "active",
    issued_at: "2030-01-01T00:00:00Z",
    last_seen_at: "2030-01-01T00:05:00Z",
    idle_expires_at: "2030-01-01T00:20:00Z",
    absolute_expires_at: "2030-01-01T08:00:00Z",
  });
  invariant(!sessionError, "Synthetic workforce session could not be prepared.");

  const service = new AuthorisationService(
    new SupabaseAuthorisationContextRepository(serverClient),
  );

  const ownIdentity = await service.authoriseHuman(
    patientProviderSession,
    "patient",
    request(
      alphaTenant,
      "identity_contact",
      patientSubject,
      "self_service",
      "read",
      patientSubject,
    ),
  );
  invariant(ownIdentity.allowed && ownIdentity.projection === "own", "Own read was denied.");

  const horizontal = await service.authoriseHuman(
    patientProviderSession,
    "patient",
    request(
      alphaTenant,
      "identity_contact",
      "20000000-0000-4000-8000-000000000099",
      "self_service",
      "read",
      "20000000-0000-4000-8000-000000000099",
    ),
  );
  invariant(
    !horizontal.allowed && horizontal.reason === "RELATIONSHIP_REQUIRED",
    "Cross-subject read was not denied.",
  );

  const crossTenant = await service.authoriseHuman(
    patientProviderSession,
    "patient",
    request(betaTenant, "identity_contact", patientSubject, "self_service", "read", patientSubject),
  );
  invariant(!crossTenant.allowed, "Cross-tenant read was not denied.");

  const vertical = await service.authoriseHuman(
    patientProviderSession,
    "patient",
    request(
      alphaTenant,
      "clinical_decision",
      crypto.randomUUID(),
      "self_service",
      "approve",
      patientSubject,
    ),
  );
  invariant(
    !vertical.allowed && vertical.reason === "ROLE_ACTION_DENIED",
    "Patient gained a clinical approval action.",
  );

  const assignedOperation = await service.authoriseHuman(
    operationsProviderSession,
    "operations",
    request(betaTenant, "fulfilment", assignedFulfilment, "operations", "update"),
  );
  invariant(
    assignedOperation.allowed && assignedOperation.projection === "operations",
    "Assigned operations access was denied.",
  );

  const unassignedOperation = await service.authoriseHuman(
    operationsProviderSession,
    "operations",
    request(betaTenant, "fulfilment", crypto.randomUUID(), "operations", "update"),
  );
  invariant(
    !unassignedOperation.allowed && unassignedOperation.reason === "RELATIONSHIP_REQUIRED",
    "Unassigned operations access was not denied.",
  );

  const serviceAllowed = await service.authoriseService(
    "80000000-0000-4000-8000-000000000001",
    new Uint8Array(32).fill(0xab),
    status.target === "local" ? "local" : "production",
    request(betaTenant, "fulfilment", assignedFulfilment, "operations", "update"),
  );
  invariant(serviceAllowed.allowed, "Exact service scope was denied.");

  const serviceCrossEnvironment = await service.authoriseService(
    "80000000-0000-4000-8000-000000000001",
    new Uint8Array(32).fill(0xab),
    status.target === "local" ? "preview" : "local",
    request(betaTenant, "fulfilment", assignedFulfilment, "operations", "update"),
  );
  invariant(
    !serviceCrossEnvironment.allowed &&
      serviceCrossEnvironment.reason === "SERVICE_ENVIRONMENT_MISMATCH",
    "Cross-environment service use was not denied.",
  );

  const invalidCredential = await service.authoriseService(
    "80000000-0000-4000-8000-000000000001",
    new Uint8Array(32),
    "local",
    request(betaTenant, "fulfilment", assignedFulfilment, "operations", "update"),
  );
  invariant(
    !invalidCredential.allowed && invalidCredential.reason === "NO_PRINCIPAL",
    "Invalid service credential was not denied.",
  );

  const { error: browserError } = await browserClient
    .from("access_assignments")
    .select("id")
    .limit(1);
  invariant(browserError?.code === "42501", "Browser role unexpectedly read assignment evidence.");
}

await run();
console.log("Synthetic Supabase contextual authorisation integration passed.");
