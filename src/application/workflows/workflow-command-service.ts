import type { ErrorContract, StableErrorCode } from "../../../contracts/errors";
import {
  workflowTransitionCommandSchema,
  type WorkflowSnapshot,
  type WorkflowTransition,
  type WorkflowTransitionCommand,
  type WorkflowTransitionResult,
} from "../../../contracts/workflows";
import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import {
  resolveServerAuthorisationResource,
  type AuthorisationAction,
  type AuthorisationPurpose,
  type AuthorisationResourceType,
  type ResourceWorkflowState,
} from "@/domain/access/authorisation";
import type { MembershipRole } from "@/domain/access/models";
import type { AuthenticationAssurance } from "@/domain/access/identity";
import {
  WorkflowRepositoryError,
  type WorkflowCommandRepository,
} from "./workflow-command-repository";

const serverActorMarker = Symbol("server-workflow-actor");

export type ServerWorkflowActor = Readonly<{
  providerSessionId: string;
  subjectId: string;
  tenantId: string;
  role: MembershipRole;
  assurance: AuthenticationAssurance;
  observedAtEpochMs: number;
  [serverActorMarker]: true;
}>;

export function resolveServerWorkflowActor(
  input: Omit<ServerWorkflowActor, typeof serverActorMarker | "observedAtEpochMs"> & {
    observedAt: Date;
  },
): ServerWorkflowActor {
  const { observedAt, ...actor } = input;
  return Object.freeze({
    ...actor,
    observedAtEpochMs: observedAt.getTime(),
    [serverActorMarker]: true as const,
  });
}

export function isServerWorkflowActor(value: unknown): value is ServerWorkflowActor {
  return Boolean(
    value && typeof value === "object" && serverActorMarker in value && value[serverActorMarker],
  );
}

type TransitionAccess = Readonly<{
  resourceType: AuthorisationResourceType;
  action: AuthorisationAction;
  purpose: AuthorisationPurpose;
}>;

const clinicalAccess: TransitionAccess = {
  resourceType: "clinical_decision",
  action: "transition",
  purpose: "care_delivery",
};
const clinicalApprovalAccess: TransitionAccess = { ...clinicalAccess, action: "approve" };
const paymentAccess: TransitionAccess = {
  resourceType: "payment",
  action: "transition",
  purpose: "operations",
};
const fulfilmentAccess: TransitionAccess = {
  resourceType: "fulfilment",
  action: "transition",
  purpose: "operations",
};

function transitionAccess(transition: WorkflowTransition): TransitionAccess {
  if (transition === "clinical.approve") return clinicalApprovalAccess;
  if (transition.startsWith("clinical.")) return clinicalAccess;
  if (transition.startsWith("payment.") || transition.startsWith("refund.")) {
    return paymentAccess;
  }
  return fulfilmentAccess;
}

function transitionState(
  snapshot: WorkflowSnapshot,
  transition: WorkflowTransition,
): ResourceWorkflowState {
  let state: string;
  if (transition.startsWith("clinical.")) state = snapshot.clinicalState;
  else if (transition.startsWith("payment.")) state = snapshot.paymentState;
  else if (transition.startsWith("supply.")) state = snapshot.supplyState;
  else if (transition.startsWith("hub.")) state = snapshot.hubReceiptState;
  else if (transition.startsWith("dispatch.")) state = snapshot.dispatchState;
  else if (transition.startsWith("delivery.")) state = snapshot.deliveryState;
  else if (transition.startsWith("cancellation.")) state = snapshot.cancellationState;
  else state = snapshot.refundState;

  if (["not_started", "not_ready", "active"].includes(state)) return "draft";
  if (["pending", "under_review", "ready", "in_transit", "requested"].includes(state)) {
    return "under_review";
  }
  if (["approved", "paid", "available", "received", "dispatched"].includes(state)) {
    return "approved";
  }
  if (["delivered", "refunded"].includes(state)) return "closed";
  return "rejected";
}

function safeError(
  correlationId: string,
  code: StableErrorCode,
  message: string,
  retry: ErrorContract["error"]["retry"],
): ErrorContract {
  return {
    contract: "error.response",
    version: 1,
    correlationId,
    error: { code, message, retry },
  };
}

export type WorkflowCommandOutcome =
  | Readonly<{ ok: true; result: WorkflowTransitionResult }>
  | Readonly<{ ok: false; error: ErrorContract }>;

async function fingerprint(command: WorkflowTransitionCommand): Promise<string> {
  const canonical = JSON.stringify({
    contract: command.contract,
    version: command.version,
    actor: command.actor,
    subjectId: command.subjectId,
    expectedVersion: command.expectedVersion,
    payload: command.payload,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class WorkflowCommandService {
  constructor(
    private readonly repository: WorkflowCommandRepository,
    private readonly authorisation: AuthorisationService,
  ) {}

  async execute(actor: unknown, input: unknown): Promise<WorkflowCommandOutcome> {
    const parsed = workflowTransitionCommandSchema.safeParse(input);
    const correlationId = parsed.success ? parsed.data.correlationId : "correlation_unknown";
    if (!parsed.success) {
      return {
        ok: false,
        error: safeError(correlationId, "VALIDATION_FAILED", "The command is invalid.", "never"),
      };
    }

    const expectedActorType =
      isServerWorkflowActor(actor) && actor.role === "patient" ? "patient" : "workforce";
    if (
      !isServerWorkflowActor(actor) ||
      !Number.isFinite(actor.observedAtEpochMs) ||
      parsed.data.actor.id !== actor.subjectId ||
      parsed.data.actor.type !== expectedActorType
    ) {
      return {
        ok: false,
        error: safeError(correlationId, "UNAUTHENTICATED", "Authentication is required.", "never"),
      };
    }

    try {
      const workflow = await this.repository.findWorkflow(
        actor.tenantId,
        parsed.data.payload.workflowId,
      );
      if (!workflow) {
        return {
          ok: false,
          error: safeError(correlationId, "NOT_FOUND", "The resource was not found.", "never"),
        };
      }
      if (parsed.data.subjectId !== workflow.subjectId) {
        return {
          ok: false,
          error: safeError(correlationId, "FORBIDDEN", "The action is not permitted.", "never"),
        };
      }

      const access = transitionAccess(parsed.data.payload.transition);
      const observedAt = new Date(actor.observedAtEpochMs);
      const decision = await this.authorisation.authoriseHuman(
        actor.providerSessionId,
        actor.role,
        {
          action: access.action,
          purpose: access.purpose,
          observedAt,
          resource: resolveServerAuthorisationResource({
            tenantId: workflow.tenantId,
            type: access.resourceType,
            id: workflow.workflowId,
            ownerSubjectId: workflow.subjectId,
            workflowState: transitionState(workflow, parsed.data.payload.transition),
            restriction: "none",
            allowedPurposes: [access.purpose],
          }),
        },
      );

      if (!decision.allowed) {
        return {
          ok: false,
          error: safeError(correlationId, "FORBIDDEN", "The action is not permitted.", "never"),
        };
      }

      const result = await this.repository.executeTransition({
        tenantId: actor.tenantId,
        workflowId: parsed.data.payload.workflowId,
        commandName: parsed.data.contract,
        requestId: parsed.data.requestId,
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint: await fingerprint(parsed.data),
        expectedVersion: parsed.data.expectedVersion,
        transition: parsed.data.payload.transition,
        occurredAt: observedAt,
        actorType: parsed.data.actor.type,
        actorSubjectId: actor.subjectId,
        actorRole: actor.role,
        assurance: actor.assurance,
        subjectId: workflow.subjectId,
        purpose: access.purpose,
        policyVersion: decision.policyVersion,
        correlationId: parsed.data.correlationId,
        causationId: parsed.data.requestId,
      });

      return { ok: true, result };
    } catch (error) {
      if (error instanceof WorkflowRepositoryError) {
        const mapping: Record<
          WorkflowRepositoryError["failure"],
          readonly [StableErrorCode, string, ErrorContract["error"]["retry"]]
        > = {
          NOT_FOUND: ["NOT_FOUND", "The resource was not found.", "never"],
          CONFLICT: ["CONFLICT", "The command conflicts with current state.", "safe"],
          PENDING_RECONCILIATION: [
            "PENDING_RECONCILIATION",
            "The command outcome requires reconciliation.",
            "reconcile",
          ],
          DEPENDENCY_UNAVAILABLE: [
            "DEPENDENCY_UNAVAILABLE",
            "The service is temporarily unavailable.",
            "after-delay",
          ],
        };
        const [code, message, retry] = mapping[error.failure];
        return { ok: false, error: safeError(correlationId, code, message, retry) };
      }
      return {
        ok: false,
        error: safeError(
          correlationId,
          "INTERNAL_FAILURE",
          "The command could not be completed.",
          "reconcile",
        ),
      };
    }
  }
}
