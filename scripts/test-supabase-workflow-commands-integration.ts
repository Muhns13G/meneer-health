import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { SupabaseAuthorisationContextRepository } from "../src/adapters/identity/supabase/supabase-authorisation-context-repository";
import { SupabaseWorkflowCommandRepository } from "../src/adapters/persistence/supabase/supabase-workflow-command-repository";
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
const workflowId = "a0000000-0000-4000-8000-000000000002";
const providerSessionId = "71000000-0000-4000-8000-000000000002";

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
    "Local workflow command services are not running.",
  );
  return status as LocalStatus;
}

function command(
  requestId: string,
  idempotencyKey: string,
  expectedVersion: number,
  transition: "supply.request" | "supply.confirm" | "hub.expect" | "dispatch.ready",
) {
  return {
    contract: "workflow.transition",
    version: 1,
    requestId,
    idempotencyKey,
    correlationId: `correlation_${requestId}`,
    actor: { type: "workforce", id: subjectId },
    subjectId,
    expectedVersion,
    requestedAt: "2030-01-01T00:10:00Z",
    payload: { workflowId, transition },
  } as const;
}

async function run(): Promise<void> {
  const status = localStatus();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);

  const { error: sessionError } = await serverClient.from("identity_sessions").upsert({
    id: "70000000-0000-4000-8000-000000000002",
    subject_id: subjectId,
    provider_session_id: providerSessionId,
    session_class: "workforce",
    assurance: "aal2",
    status: "active",
    issued_at: "2030-01-01T00:00:00Z",
    last_seen_at: "2030-01-01T00:05:00Z",
    idle_expires_at: "2030-01-01T00:20:00Z",
    absolute_expires_at: "2030-01-01T08:00:00Z",
  });
  invariant(!sessionError, "Synthetic workforce session could not be prepared.");

  const repository = new SupabaseWorkflowCommandRepository(serverClient);
  const service = new WorkflowCommandService(
    repository,
    new AuthorisationService(new SupabaseAuthorisationContextRepository(serverClient)),
  );
  const actor = resolveServerWorkflowActor({
    providerSessionId,
    subjectId,
    tenantId,
    role: "operations",
    assurance: "aal2",
    observedAt: new Date("2030-01-01T00:10:00Z"),
  });

  const first = await service.execute(
    actor,
    command("request_supply_01", "retry_supply_01", 0, "supply.request"),
  );
  invariant(
    first.ok && first.result.version === 1 && !first.result.replayed,
    "Initial command did not commit.",
  );

  const replay = await service.execute(
    actor,
    command("request_supply_replay", "retry_supply_01", 0, "supply.request"),
  );
  invariant(
    replay.ok && replay.result.version === 1 && replay.result.replayed,
    "Replay was not deduplicated.",
  );

  const rebound = await service.execute(
    actor,
    command("request_supply_rebound", "retry_supply_01", 1, "supply.confirm"),
  );
  invariant(
    !rebound.ok && rebound.error.error.code === "CONFLICT",
    "Changed replay was not rejected.",
  );

  const stale = await service.execute(
    actor,
    command("request_supply_stale", "retry_supply_stale", 0, "supply.confirm"),
  );
  invariant(!stale.ok && stale.error.error.code === "CONFLICT", "Stale version was not rejected.");

  const concurrent = await Promise.all([
    service.execute(actor, command("request_supply_02a", "retry_supply_02", 1, "supply.confirm")),
    service.execute(actor, command("request_supply_02b", "retry_supply_02", 1, "supply.confirm")),
  ]);
  invariant(
    concurrent.every((outcome) => outcome.ok),
    "Concurrent identical command failed.",
  );
  const concurrentResults = concurrent.flatMap((outcome) => (outcome.ok ? [outcome.result] : []));
  invariant(
    concurrentResults.filter((result) => result.replayed).length === 1 &&
      concurrentResults.every((result) => result.version === 2),
    "Concurrent identical commands did not commit once and replay once.",
  );

  const impossible = await service.execute(
    actor,
    command("request_dispatch_invalid", "retry_dispatch_invalid", 2, "dispatch.ready"),
  );
  invariant(
    !impossible.ok && impossible.error.error.code === "CONFLICT",
    "Missing dispatch prerequisites did not fail safely.",
  );

  const afterFailure = await repository.findWorkflow(tenantId, workflowId);
  invariant(
    afterFailure?.version === 2 && afterFailure.dispatchState === "not_ready",
    "Rejected command mutated durable state.",
  );
  const { count: falseReceiptCount, error: receiptError } = await serverClient
    .from("command_receipts")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", "retry_dispatch_invalid");
  invariant(
    !receiptError && falseReceiptCount === 0,
    "Rejected command created false success evidence.",
  );

  const { error: browserReadError } = await browserClient
    .from("workflow_instances")
    .select("id")
    .limit(1);
  invariant(browserReadError?.code === "42501", "Browser role unexpectedly read workflow state.");

  const { error: browserCommandError } = await browserClient.rpc(
    "execute_audited_workflow_transition",
    {
      p_tenant_id: tenantId,
      p_workflow_id: workflowId,
      p_command_name: "workflow.transition",
      p_request_id: "request_browser",
      p_idempotency_key: "retry_browser",
      p_request_fingerprint: "f".repeat(64),
      p_expected_version: 2,
      p_transition: "hub.expect",
      p_occurred_at: "2030-01-01T00:10:00Z",
      p_actor_type: "workforce",
      p_actor_subject_id: subjectId,
      p_actor_role: "operations",
      p_assurance: "aal2",
      p_subject_id: subjectId,
      p_purpose: "operations",
      p_policy_version: "authorisation.v1",
      p_correlation_id: "correlation_browser",
      p_causation_id: "request_browser",
    },
  );
  invariant(
    browserCommandError?.code === "42501",
    "Browser role invoked the server command function.",
  );
}

await run();
console.log("Synthetic Supabase workflow command integration passed.");
