import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { SupabaseDataLifecycleRepository } from "../src/adapters/persistence/supabase/supabase-data-lifecycle-repository";

type LocalStatus = Readonly<{ API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }>;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function localStatus(): LocalStatus {
  const stdout = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  });
  const jsonStart = stdout.indexOf("{");
  invariant(jsonStart >= 0, "Local Supabase status did not return JSON.");
  const status = JSON.parse(stdout.slice(jsonStart)) as Partial<LocalStatus>;
  invariant(
    status.API_URL && status.PUBLISHABLE_KEY && status.SECRET_KEY,
    "Local lifecycle services are not running.",
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
  const repository = new SupabaseDataLifecycleRepository(serverClient);
  const context = {
    tenantId: "10000000-0000-4000-8000-000000000002",
    subjectId: "20000000-0000-4000-8000-000000000002",
    actorSubjectId: "20000000-0000-4000-8000-000000000003",
    actorRole: "auditor",
    assurance: "aal2",
    purpose: "privacy_review",
    correlationId: "lifecycle_integration_01",
    occurredAt: new Date("2030-01-01T02:00:00Z"),
  } as const;

  const exportRequest = await repository.openRequest(
    context,
    "access_export",
    "export-integration-01",
  );
  const exported = await repository.completeExport(
    { ...context, correlationId: "lifecycle_integration_02" },
    exportRequest.requestId,
  );
  invariant(
    exported.status === "completed" && exported.expiresAt !== null,
    "Export did not complete securely.",
  );

  const erasure = await repository.openRequest(context, "erasure", "erasure-integration-01");
  const pending = await repository.executeErasure(
    { ...context, correlationId: "lifecycle_integration_03" },
    erasure.requestId,
  );
  invariant(
    pending.status === "pending_reconciliation" && pending.reconciliationPending.length === 3,
    "Erasure falsely reported completion before reconciliation.",
  );
  let result = pending;
  for (const destination of ["identity", "storage", "recovery_backup"] as const) {
    result = await repository.reconcileDestination(
      { ...context, correlationId: `lifecycle_reconcile_${destination}` },
      erasure.requestId,
      destination,
    );
  }
  invariant(result.status === "completed", "Erasure did not close after complete reconciliation.");

  const { error } = await browserClient.rpc("open_data_subject_request", {
    p_tenant_id: context.tenantId,
    p_subject_id: context.subjectId,
    p_actor_subject_id: context.actorSubjectId,
    p_actor_role: context.actorRole,
    p_assurance: context.assurance,
    p_purpose: context.purpose,
    p_correlation_id: "browser_lifecycle_forbidden",
    p_occurred_at: context.occurredAt.toISOString(),
    p_request_type: "access_export",
    p_idempotency_key: "browser-request-01",
  });
  invariant(error?.code === "42501", "Browser role reached the lifecycle RPC.");
}

await run();
console.log("Synthetic Supabase lifecycle integration passed.");
