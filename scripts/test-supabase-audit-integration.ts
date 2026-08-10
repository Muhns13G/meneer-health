import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { SupabaseAuthorisationContextRepository } from "../src/adapters/identity/supabase/supabase-authorisation-context-repository";
import { SupabaseAuditEvidenceRepository } from "../src/adapters/persistence/supabase/supabase-audit-evidence-repository";
import { SupabaseIntegrationInboxRepository } from "../src/adapters/persistence/supabase/supabase-integration-inbox-repository";
import { SupabaseWorkflowCommandRepository } from "../src/adapters/persistence/supabase/supabase-workflow-command-repository";
import { AuditEvidenceService } from "../src/application/audit/audit-evidence-service";
import { IntegrationInboxRepositoryError } from "../src/application/integration/integration-inbox-repository";
import { AuthorisationService } from "../src/application/authorisation/authorisation-service";
import {
  resolveServerWorkflowActor,
  WorkflowCommandService,
} from "../src/application/workflows/workflow-command-service";

type LocalStatus = Readonly<{
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}>;

const tenantId = "10000000-0000-4000-8000-000000000002";
const subjectId = "20000000-0000-4000-8000-000000000002";
const auditorId = "20000000-0000-4000-8000-000000000003";
const workflowId = "a0000000-0000-4000-8000-000000000003";
const operationsSessionId = "71000000-0000-4000-8000-000000000004";
const auditorSessionId = "71000000-0000-4000-8000-000000000003";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function localStatus(): LocalStatus {
  const stdout = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
  });
  const jsonStart = stdout.indexOf("{");
  invariant(jsonStart >= 0, "Local Supabase status did not return JSON.");
  const status = JSON.parse(stdout.slice(jsonStart)) as Partial<LocalStatus>;
  invariant(
    status.API_URL && status.PUBLISHABLE_KEY && status.SECRET_KEY,
    "Local audit services are not running.",
  );
  return status as LocalStatus;
}

async function run(): Promise<void> {
  const status = localStatus();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);

  const { error: operationsSessionError } = await serverClient.from("identity_sessions").upsert({
    id: "70000000-0000-4000-8000-000000000004",
    subject_id: subjectId,
    provider_session_id: operationsSessionId,
    session_class: "workforce",
    assurance: "aal2",
    status: "active",
    issued_at: "2030-01-01T00:00:00Z",
    last_seen_at: "2030-01-01T00:05:00Z",
    idle_expires_at: "2030-01-01T00:20:00Z",
    absolute_expires_at: "2030-01-01T08:00:00Z",
  });
  invariant(!operationsSessionError, "Synthetic operations session could not be prepared.");

  const workflowRepository = new SupabaseWorkflowCommandRepository(serverClient);
  const authorisation = new AuthorisationService(
    new SupabaseAuthorisationContextRepository(serverClient),
  );
  const workflowService = new WorkflowCommandService(workflowRepository, authorisation);
  const operationsActor = resolveServerWorkflowActor({
    providerSessionId: operationsSessionId,
    subjectId,
    tenantId,
    role: "operations",
    assurance: "aal2",
    observedAt: new Date("2030-01-01T00:10:00Z"),
  });
  const command = {
    contract: "workflow.transition",
    version: 1,
    requestId: "audit_integration_request_01",
    idempotencyKey: "audit_integration_retry_01",
    correlationId: "audit_integration_trace_01",
    actor: { type: "workforce", id: subjectId },
    subjectId,
    expectedVersion: 0,
    requestedAt: "2030-01-01T00:10:00Z",
    payload: { workflowId, transition: "supply.request" },
  } as const;

  const first = await workflowService.execute(operationsActor, command);
  invariant(first.ok && first.result.version === 1, "Audited workflow command did not commit.");
  const replay = await workflowService.execute(operationsActor, {
    ...command,
    requestId: "audit_integration_request_replay",
    correlationId: "audit_integration_trace_replay",
  });
  invariant(replay.ok && replay.result.replayed, "Audited command replay was not deduplicated.");

  const auditService = new AuditEvidenceService(
    new SupabaseAuditEvidenceRepository(serverClient),
    workflowRepository,
    authorisation,
  );
  const auditorActor = resolveServerWorkflowActor({
    providerSessionId: auditorSessionId,
    subjectId: auditorId,
    tenantId,
    role: "auditor",
    assurance: "aal2",
    observedAt: new Date("2030-01-01T00:20:00Z"),
  });
  const review = await auditService.review(auditorActor, {
    workflowId,
    correlationId: "audit_review_trace_01",
    limit: 50,
  });
  invariant(review.ok, "Purpose-bound audit review failed.");
  invariant(review.result.chainVerified, "Audit hash chain did not verify.");
  invariant(
    review.result.events.length === 1 &&
      review.result.events[0]?.action === "workflow.transition" &&
      review.result.events[0]?.correlationId === "audit_integration_trace_01",
    "Audit review did not return the single committed command fact.",
  );

  const inboxRepository = new SupabaseIntegrationInboxRepository(serverClient);
  const inboxMessage = {
    tenantId,
    provider: "synthetic",
    environment: "local",
    externalEventId: "synthetic_provider_event_01",
    payloadFingerprint: "c".repeat(64),
    correlationId: "integration_inbox_trace_01",
    serviceIdentityId: "80000000-0000-4000-8000-000000000001",
    receivedAt: new Date("2030-01-01T00:25:00Z"),
    safeMetadata: { eventName: "synthetic.received" },
  } as const;
  const inbox = await inboxRepository.receive(inboxMessage);
  invariant(!inbox.replayed && inbox.status === "verified", "Inbox receipt was not recorded.");
  const inboxReplay = await inboxRepository.receive(inboxMessage);
  invariant(inboxReplay.replayed, "Inbox replay was not deduplicated.");
  let conflictRejected = false;
  try {
    await inboxRepository.receive({ ...inboxMessage, payloadFingerprint: "d".repeat(64) });
  } catch (error) {
    conflictRejected = error instanceof IntegrationInboxRepositoryError;
  }
  invariant(conflictRejected, "Changed inbox replay was not rejected.");

  const { error: browserAuditReadError } = await browserClient
    .from("audit_events")
    .select("id")
    .limit(1);
  invariant(browserAuditReadError?.code === "42501", "Browser role read audit evidence.");
  const { error: browserReviewError } = await browserClient.rpc("review_audit_evidence", {
    p_tenant_id: tenantId,
    p_aggregate_id: workflowId,
    p_actor_subject_id: auditorId,
    p_actor_role: "auditor",
    p_assurance: "aal2",
    p_purpose: "privacy_review",
    p_policy_version: "authorisation.v1",
    p_correlation_id: "browser_review_trace",
    p_occurred_at: "2030-01-01T00:20:00Z",
    p_limit: 50,
  });
  invariant(browserReviewError?.code === "42501", "Browser role invoked audit review.");
}

await run();
console.log("Synthetic Supabase audit, inbox, and outbox integration passed.");
