import { createClient } from "@supabase/supabase-js";

import { SupabaseSecurityEvidenceRepository } from "../src/adapters/persistence/supabase/supabase-security-evidence-repository";
import { SecurityEvidenceService } from "../src/application/observability/security-evidence-service";
import { authorisationPolicyVersion } from "../src/domain/access/authorisation";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  const status = readSupabaseIntegrationEnvironment();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const service = new SecurityEvidenceService(new SupabaseSecurityEvidenceRepository(serverClient));
  const common = {
    tenantId: "10000000-0000-4000-8000-000000000002",
    actorId: "20000000-0000-4000-8000-000000000002",
    role: "operations",
    assurance: "aal2",
    subjectId: "20000000-0000-4000-8000-000000000001",
    resourceType: "fulfilment",
    resourceId: "a0000000-0000-4000-8000-000000000099",
    purpose: "operations",
    correlationId: "security_integration_denial_01",
    occurredAt: new Date("2030-01-01T00:30:00Z"),
  } as const;

  const denial = await service.recordHumanAuthorisationDenial(common, {
    allowed: false,
    reason: "RELATIONSHIP_REQUIRED",
    policyVersion: authorisationPolicyVersion,
  });
  invariant(denial.sequence > 0, "Authorisation denial was not appended.");

  const breakGlass = await service.recordBreakGlassDenial(
    {
      ...common,
      actorId: "20000000-0000-4000-8000-000000000003",
      role: "admin",
      purpose: "security_administration",
      correlationId: "security_integration_break_glass_01",
    },
    "BREAK_GLASS_DISABLED",
    "break-glass.v1",
  );
  invariant(
    breakGlass.sequence === denial.sequence + 1,
    "Break-glass denial did not follow the authorisation denial.",
  );

  const { error: browserInvocationError } = await browserClient.rpc("record_security_audit_event", {
    p_tenant_id: common.tenantId,
    p_actor_type: "workforce",
    p_actor_id: common.actorId,
    p_actor_role: common.role,
    p_assurance: common.assurance,
    p_action: "authorisation.denied",
    p_subject_id: common.subjectId,
    p_resource_type: common.resourceType,
    p_resource_id: common.resourceId,
    p_purpose: common.purpose,
    p_policy_version: authorisationPolicyVersion,
    p_reason_code: "RELATIONSHIP_REQUIRED",
    p_correlation_id: "browser_must_not_append",
    p_occurred_at: common.occurredAt.toISOString(),
  });
  invariant(browserInvocationError?.code === "42501", "Browser role appended security evidence.");
}

await run();
console.log("Synthetic Supabase security evidence integration passed.");
