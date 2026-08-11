import type { SessionClass } from "@/domain/access/identity";
import type { MembershipRole } from "@/domain/access/models";
import {
  authorisationPolicyVersion,
  isServerResolvedAuthorisationResource,
  type AccessAssignment,
  type AuthorisationAction,
  type AuthorisationDecision,
  type AuthorisationProjection,
  type AuthorisationPurpose,
  type AuthorisationRequest,
  type AuthorisationResourceType,
  type HumanAuthorisationPrincipal,
  type ResourceWorkflowState,
  type ServiceAuthorisationPrincipal,
} from "@/domain/access/authorisation";

type Relationship = "own" | "assigned";
type PolicyRule = Readonly<{
  actions: readonly AuthorisationAction[];
  purposes: readonly AuthorisationPurpose[];
  relationships: readonly Relationship[];
  states: readonly ResourceWorkflowState[];
  projection: AuthorisationProjection;
  minimumSessionClass?: SessionClass;
}>;

const readableStates: readonly ResourceWorkflowState[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "active",
  "closed",
];
const mutableStates: readonly ResourceWorkflowState[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "active",
];
const reviewStates: readonly ResourceWorkflowState[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "active",
  "closed",
];

function rule(
  actions: readonly AuthorisationAction[],
  purposes: readonly AuthorisationPurpose[],
  relationships: readonly Relationship[],
  states: readonly ResourceWorkflowState[],
  projection: AuthorisationProjection,
  minimumSessionClass?: SessionClass,
): PolicyRule {
  return {
    actions,
    purposes,
    relationships,
    states,
    projection,
    ...(minimumSessionClass ? { minimumSessionClass } : {}),
  };
}

const deny = [] as const;
const ownRead = rule(["read"], ["self_service"], ["own"], readableStates, "own");
const assignedStatus = (purpose: AuthorisationPurpose) =>
  rule(["read"], [purpose], ["assigned"], readableStates, "status", "workforce");
const evidenceRead = rule(
  ["read"],
  ["privacy_review"],
  ["assigned"],
  readableStates,
  "evidence",
  "workforce",
);

export const humanPolicyMatrix: Readonly<
  Record<MembershipRole, Readonly<Record<AuthorisationResourceType, readonly PolicyRule[]>>>
> = {
  patient: {
    identity_contact: [rule(["read", "update"], ["self_service"], ["own"], mutableStates, "own")],
    consent: [
      rule(
        ["create", "read", "update", "transition"],
        ["self_service"],
        ["own"],
        readableStates,
        "own",
      ),
    ],
    intake: [
      rule(
        ["create", "read", "update", "transition"],
        ["self_service"],
        ["own"],
        mutableStates,
        "own",
      ),
    ],
    clinical_decision: [ownRead],
    prescription: [ownRead],
    payment: [
      rule(["create", "read", "transition"], ["self_service"], ["own"], mutableStates, "own"),
    ],
    fulfilment: [rule(["read", "update"], ["self_service"], ["own"], mutableStates, "own")],
    support_case: [
      rule(["create", "read", "update"], ["self_service"], ["own"], mutableStates, "own"),
    ],
    audit_evidence: [ownRead],
    role_permission: deny,
    privileged_asset: [
      rule(["export"], ["self_service"], ["own"], readableStates, "own", "privileged"),
    ],
  },
  clinician: {
    identity_contact: deny,
    consent: [assignedStatus("care_delivery")],
    intake: [
      rule(
        ["read", "update", "transition"],
        ["care_delivery"],
        ["assigned"],
        mutableStates,
        "clinical",
        "workforce",
      ),
    ],
    clinical_decision: [
      rule(
        ["create", "read", "update", "transition", "approve"],
        ["care_delivery"],
        ["assigned"],
        mutableStates,
        "clinical",
        "workforce",
      ),
    ],
    prescription: [
      rule(
        ["create", "read", "update", "transition", "approve"],
        ["care_delivery"],
        ["assigned"],
        mutableStates,
        "clinical",
        "workforce",
      ),
    ],
    payment: deny,
    fulfilment: [assignedStatus("care_delivery")],
    support_case: [
      rule(
        ["read", "update"],
        ["care_delivery"],
        ["assigned"],
        mutableStates,
        "clinical",
        "workforce",
      ),
    ],
    audit_evidence: [
      rule(["read"], ["care_delivery"], ["assigned"], readableStates, "evidence", "workforce"),
    ],
    role_permission: deny,
    privileged_asset: deny,
  },
  pharmacy: {
    identity_contact: deny,
    consent: [assignedStatus("dispensing")],
    intake: deny,
    clinical_decision: [assignedStatus("dispensing")],
    prescription: [
      rule(
        ["read", "update", "transition"],
        ["dispensing"],
        ["assigned"],
        mutableStates,
        "dispensing",
        "workforce",
      ),
    ],
    payment: deny,
    fulfilment: [
      rule(
        ["read", "update", "transition"],
        ["dispensing"],
        ["assigned"],
        mutableStates,
        "dispensing",
        "workforce",
      ),
    ],
    support_case: [
      rule(
        ["read", "update"],
        ["dispensing"],
        ["assigned"],
        mutableStates,
        "dispensing",
        "workforce",
      ),
    ],
    audit_evidence: [assignedStatus("dispensing")],
    role_permission: deny,
    privileged_asset: deny,
  },
  operations: {
    identity_contact: [assignedStatus("operations")],
    consent: [assignedStatus("operations")],
    intake: [assignedStatus("operations")],
    clinical_decision: [assignedStatus("operations")],
    prescription: [assignedStatus("operations")],
    payment: [
      rule(
        ["read", "update", "transition"],
        ["operations"],
        ["assigned"],
        mutableStates,
        "operations",
        "workforce",
      ),
    ],
    fulfilment: [
      rule(
        ["read", "update", "transition", "assign"],
        ["operations"],
        ["assigned"],
        mutableStates,
        "operations",
        "workforce",
      ),
    ],
    support_case: [
      rule(
        ["read", "update", "assign"],
        ["operations"],
        ["assigned"],
        mutableStates,
        "operations",
        "workforce",
      ),
    ],
    audit_evidence: deny,
    role_permission: deny,
    privileged_asset: deny,
  },
  support: {
    identity_contact: [assignedStatus("support")],
    consent: [assignedStatus("support")],
    intake: [assignedStatus("support")],
    clinical_decision: [assignedStatus("support")],
    prescription: [assignedStatus("support")],
    payment: [assignedStatus("support")],
    fulfilment: [assignedStatus("support")],
    support_case: [
      rule(["read", "update"], ["support"], ["assigned"], mutableStates, "support", "workforce"),
    ],
    audit_evidence: deny,
    role_permission: deny,
    privileged_asset: deny,
  },
  auditor: {
    identity_contact: [evidenceRead],
    consent: [evidenceRead],
    intake: [evidenceRead],
    clinical_decision: [evidenceRead],
    prescription: [evidenceRead],
    payment: [evidenceRead],
    fulfilment: [evidenceRead],
    support_case: [evidenceRead],
    audit_evidence: [
      evidenceRead,
      rule(["export"], ["privacy_review"], ["assigned"], reviewStates, "evidence", "privileged"),
    ],
    role_permission: [evidenceRead],
    privileged_asset: [
      rule(["export"], ["privacy_review"], ["assigned"], reviewStates, "evidence", "privileged"),
    ],
  },
  admin: {
    identity_contact: [
      rule(
        ["update", "transition"],
        ["security_administration"],
        ["assigned"],
        mutableStates,
        "status",
        "privileged",
      ),
    ],
    consent: deny,
    intake: deny,
    clinical_decision: deny,
    prescription: deny,
    payment: deny,
    fulfilment: deny,
    support_case: deny,
    audit_evidence: [
      rule(
        ["read"],
        ["security_administration"],
        ["assigned"],
        readableStates,
        "evidence",
        "privileged",
      ),
    ],
    role_permission: [
      rule(
        ["create", "read", "update", "transition", "assign", "administer"],
        ["security_administration"],
        ["assigned"],
        mutableStates,
        "configuration",
        "privileged",
      ),
    ],
    privileged_asset: [
      rule(
        ["create", "read", "update", "transition", "administer"],
        ["security_administration"],
        ["assigned"],
        mutableStates,
        "configuration",
        "privileged",
      ),
    ],
  },
  release: {
    identity_contact: deny,
    consent: deny,
    intake: deny,
    clinical_decision: deny,
    prescription: deny,
    payment: deny,
    fulfilment: deny,
    support_case: deny,
    audit_evidence: [
      rule(
        ["read"],
        ["release_management"],
        ["assigned"],
        readableStates,
        "evidence",
        "privileged",
      ),
    ],
    role_permission: deny,
    privileged_asset: [
      rule(
        ["read", "update", "transition"],
        ["release_management"],
        ["assigned"],
        mutableStates,
        "configuration",
        "privileged",
      ),
    ],
  },
};

const sessionClassRank: Record<SessionClass, number> = {
  patient: 1,
  workforce: 2,
  privileged: 3,
};

function denied(reason: AuthorisationDecision["reason"]): AuthorisationDecision {
  return { allowed: false, reason, policyVersion: authorisationPolicyVersion };
}

export function evaluateHumanAuthorisation(
  principal: HumanAuthorisationPrincipal | null,
  request: AuthorisationRequest,
  assignments: readonly AccessAssignment[],
): AuthorisationDecision {
  if (!principal) return denied("NO_PRINCIPAL");
  if (!isServerResolvedAuthorisationResource(request.resource)) {
    return denied("RESOURCE_UNRESOLVED");
  }
  if (principal.subjectStatus !== "active") return denied("SUBJECT_INACTIVE");
  if (principal.tenantStatus !== "active") return denied("TENANT_INACTIVE");
  if (principal.tenantId !== request.resource.tenantId) return denied("TENANT_MISMATCH");
  if (principal.membershipStatus !== "active") return denied("MEMBERSHIP_INACTIVE");
  if (request.observedAt < principal.membershipValidFrom) {
    return denied("MEMBERSHIP_NOT_YET_ACTIVE");
  }
  if (principal.membershipExpiresAt && request.observedAt >= principal.membershipExpiresAt) {
    return denied("MEMBERSHIP_EXPIRED");
  }
  if (principal.session.status !== "active") return denied("SESSION_INACTIVE");
  if (
    request.observedAt >= principal.session.idleExpiresAt ||
    request.observedAt >= principal.session.absoluteExpiresAt
  ) {
    return denied("SESSION_EXPIRED");
  }
  if (request.resource.restriction !== "none") return denied("RESOURCE_RESTRICTED");

  const rules = humanPolicyMatrix[principal.role][request.resource.type];
  const actionRules = rules.filter((candidate) => candidate.actions.includes(request.action));
  if (actionRules.length === 0) return denied("ROLE_ACTION_DENIED");

  const purposeRules = actionRules.filter(
    (candidate) =>
      candidate.purposes.includes(request.purpose) &&
      request.resource.allowedPurposes.includes(request.purpose),
  );
  if (purposeRules.length === 0) return denied("PURPOSE_DENIED");

  const stateRules = purposeRules.filter((candidate) =>
    candidate.states.includes(request.resource.workflowState),
  );
  if (stateRules.length === 0) return denied("WORKFLOW_STATE_DENIED");

  const assuredRules = stateRules.filter(
    (candidate) =>
      !candidate.minimumSessionClass ||
      (principal.session.assurance === "aal2" &&
        sessionClassRank[principal.session.sessionClass] >=
          sessionClassRank[candidate.minimumSessionClass]),
  );
  if (assuredRules.length === 0) return denied("ASSURANCE_INSUFFICIENT");

  const ownsResource = request.resource.ownerSubjectId === principal.subjectId;
  const hasAssignment = assignments.some(
    (assignment) =>
      assignment.tenantId === principal.tenantId &&
      assignment.subjectId === principal.subjectId &&
      assignment.resourceType === request.resource.type &&
      assignment.resourceId === request.resource.id &&
      assignment.purpose === request.purpose &&
      assignment.status === "active" &&
      assignment.validFrom <= request.observedAt &&
      request.observedAt < assignment.expiresAt,
  );
  const relationshipRule = assuredRules.find(
    (candidate) =>
      (ownsResource && candidate.relationships.includes("own")) ||
      (hasAssignment && candidate.relationships.includes("assigned")),
  );
  if (!relationshipRule) return denied("RELATIONSHIP_REQUIRED");

  return {
    allowed: true,
    reason: "ALLOWED",
    policyVersion: authorisationPolicyVersion,
    projection: relationshipRule.projection,
    assurance: principal.session.assurance,
  };
}

export function evaluateServiceAuthorisation(
  principal: ServiceAuthorisationPrincipal | null,
  request: AuthorisationRequest,
  environment: ServiceAuthorisationPrincipal["environment"],
): AuthorisationDecision {
  if (!principal) return denied("NO_PRINCIPAL");
  if (!isServerResolvedAuthorisationResource(request.resource)) {
    return denied("RESOURCE_UNRESOLVED");
  }
  if (principal.status !== "active") return denied("SERVICE_INACTIVE");
  if (request.observedAt >= principal.expiresAt) return denied("SERVICE_EXPIRED");
  if (principal.environment !== environment) return denied("SERVICE_ENVIRONMENT_MISMATCH");
  if (principal.tenantId && principal.tenantId !== request.resource.tenantId) {
    return denied("TENANT_MISMATCH");
  }
  if (request.resource.restriction !== "none") return denied("RESOURCE_RESTRICTED");
  if (
    principal.purpose !== request.purpose ||
    !request.resource.allowedPurposes.includes(request.purpose)
  ) {
    return denied("PURPOSE_DENIED");
  }
  if (
    !principal.scopes.some(
      (scope) => scope.resource === request.resource.type && scope.action === request.action,
    )
  ) {
    return denied("SERVICE_SCOPE_DENIED");
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    policyVersion: authorisationPolicyVersion,
    projection: "operations",
  };
}
