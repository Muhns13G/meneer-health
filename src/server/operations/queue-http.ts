import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseQueueRepository } from "@/adapters/persistence/supabase/supabase-queue-repository";
import { queueFilterSchema } from "@/application/operations/queue-projection";
import { handoffCommandSchema } from "@/application/operations/handoff-command";
import {
  handoffEvidenceCommandSchema,
  destinationApprovalSchema,
} from "@/application/operations/handoff-boundary";
import { readHandoffChannel } from "./handoff-channel";
import {
  queueCommandSchema,
  QueueConflictError,
  QueueReadinessError,
} from "@/application/operations/queue-command";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { classifyTelemetryEnvironment, emitTelemetry } from "@/server/observability/telemetry";

function response(status: number, value?: unknown) {
  return new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      "Content-Type": "application/json",
    },
  });
}
export function createQueueHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    queue: Pick<SupabaseQueueRepository, "list" | "detail" | "command" | "handoff">;
    boundary?: Pick<SupabaseQueueRepository, "verifyEvidence" | "approveDestination">;
    audit?: Pick<SupabaseQueueRepository, "recordDenial">;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      ![
        "/staff/queue/read",
        "/staff/queue/detail",
        "/staff/queue/command",
        "/staff/queue/handoff",
        "/staff/queue/evidence",
        "/staff/queue/destination",
      ].includes(url.pathname)
    )
      return response(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: /\/(command|handoff|evidence|destination)$/.test(url.pathname)
        ? "operations-command"
        : "operations-read",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 512,
    });
    if (!inspected.allowed) return response(inspected.response.status);
    const fields = inspected.value;
    const only = (...names: string[]) =>
      [...fields.keys()].length === names.length && names.every((n) => fields.has(n));
    let filter;
    let command;
    let handoff;
    let evidence;
    let approval;
    const caseId = fields.get("caseId");
    const overrideAttempt =
      url.pathname.endsWith("/command") &&
      ["override", "break_glass", "force_handoff"].includes(fields.get("action") ?? "");
    if (overrideAttempt) {
      // Still authenticate the actor before recording a denied override; never execute it.
    } else if (url.pathname.endsWith("/evidence") || url.pathname.endsWith("/destination")) {
      const value = Object.fromEntries(fields);
      if (url.pathname.endsWith("/evidence")) {
        const parsed = handoffEvidenceCommandSchema.safeParse(value);
        if (!parsed.success) return response(422);
        evidence = parsed.data;
      } else {
        const parsed = destinationApprovalSchema.safeParse(value);
        if (!parsed.success) return response(422);
        approval = parsed.data;
      }
    } else if (/\/(command|handoff)$/.test(url.pathname)) {
      const value = Object.fromEntries(fields);
      const schema = url.pathname.endsWith("/handoff") ? handoffCommandSchema : queueCommandSchema;
      const parsed = schema.safeParse({
        ...value,
        ...(value.evidenceId === "" ? { evidenceId: null } : {}),
        expectedVersion: /^\d+$/.test(value.expectedVersion ?? "")
          ? Number(value.expectedVersion)
          : null,
      });
      if (!parsed.success) return response(422);
      if (url.pathname.endsWith("/handoff")) handoff = handoffCommandSchema.parse(parsed.data);
      else command = queueCommandSchema.parse(parsed.data);
    } else if (url.pathname.endsWith("/detail")) {
      if (!only("caseId") || !z.uuid().safeParse(caseId).success) return response(422);
    } else {
      if (!only("state", "afterCreatedAt", "afterId")) return response(422);
      const parsed = queueFilterSchema.safeParse({
        state: fields.get("state") || null,
        cursor:
          fields.get("afterCreatedAt") || fields.get("afterId")
            ? {
                createdAt: fields.get("afterCreatedAt"),
                id: fields.get("afterId"),
              }
            : null,
      });
      if (!parsed.success) return response(422);
      filter = parsed.data;
    }
    let authorised: { identity: ProviderIdentity; proof: WorkforceProof } | undefined;
    let audit = injected?.audit;
    const denial = async (
      status: number,
      reason: "QUEUE_REJECTED" | "QUEUE_CONFLICT" | "QUEUE_NOT_READY" | "BREAK_GLASS_DISABLED",
    ) => {
      try {
        if (!authorised || !audit) throw new Error("OPERATIONS_AUDIT_UNAVAILABLE");
        await audit.recordDenial(authorised.identity, authorised.proof, reason);
        return response(status);
      } catch {
        emitTelemetry({
          contract: "telemetry.event",
          version: 1,
          occurredAt: new Date().toISOString(),
          environment: classifyTelemetryEnvironment(url.hostname),
          event: "request.denied",
          severity: "critical",
          outcome: "failed",
          correlationId: crypto.randomUUID(),
          reasonCode: "INTERNAL_FAILURE",
          statusClass: "5xx",
        });
        return response(503);
      }
    };
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return response(401);
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `queue-read:${proof.sessionId}` }))
          .success
      )
        return response(429);
      const workforce = injected?.workforce ?? workforceServiceFor(bindings);
      const { identity, context, session } = await workforce.authorise(proof);
      authorised = { identity, proof };
      const config = injected
        ? undefined
        : initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
      if (!injected && !config) return response(503);
      const queue =
        injected?.queue ??
        new SupabaseQueueRepository(
          createClient(config!.url, config!.secretKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          }),
        );
      audit ??= injected ? undefined : (queue as SupabaseQueueRepository);
      if (overrideAttempt) return denial(403, "BREAK_GLASS_DISABLED");
      if (
        approval
          ? context.role !== "admin" || context.purpose !== "security_administration"
          : context.role !== "operations" || context.purpose !== "operations"
      )
        return denial(403, "QUEUE_REJECTED");
      if (evidence || approval) {
        const boundary =
          injected?.boundary ?? (injected ? null : (queue as SupabaseQueueRepository));
        if (!boundary) return response(503);
        const result = evidence
          ? { evidenceId: await boundary.verifyEvidence(identity, proof, evidence) }
          : {
              destinationId: await boundary.approveDestination(identity, proof, {
                ...(await readHandoffChannel(bindings)),
                ...approval!,
              }),
            };
        return response(200, result);
      }
      const result = response(
        200,
        handoff
          ? await queue.handoff(identity, proof, handoff)
          : filter
            ? await queue.list(identity, proof, filter)
            : command
              ? await queue.command(identity, proof, command)
              : await queue.detail(identity, proof, caseId!),
      );
      result.headers.set(
        "X-Session-Expires-At",
        new Date(
          Math.min(
            session.idleExpiresAt.getTime(),
            session.absoluteExpiresAt.getTime(),
            identity.expiresAt.getTime(),
          ),
        ).toISOString(),
      );
      return result;
    } catch (error) {
      if (error instanceof QueueConflictError) return denial(409, "QUEUE_CONFLICT");
      if (error instanceof QueueReadinessError) return denial(412, "QUEUE_NOT_READY");
      if (authorised && error instanceof IdentityRejectedError)
        return denial(403, "QUEUE_REJECTED");
      return response(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 403
          : 503,
      );
    }
  };
}
