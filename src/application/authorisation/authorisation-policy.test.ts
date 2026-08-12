import { describe, expect, it } from "vitest";

import type {
  AccessAssignment,
  AuthorisationPurpose,
  AuthorisationRequest,
  AuthorisationResourceType,
  HumanAuthorisationPrincipal,
  ServiceAuthorisationPrincipal,
} from "@/domain/access/authorisation";
import { resolveServerAuthorisationResource } from "@/domain/access/authorisation";
import type { MembershipRole } from "@/domain/access/models";
import {
  evaluateHumanAuthorisation,
  evaluateServiceAuthorisation,
  humanPolicyMatrix,
} from "./authorisation-policy";

const observedAt = new Date("2030-01-01T01:00:00Z");
const tenantId = "10000000-0000-4000-8000-000000000001";
const subjectId = "20000000-0000-4000-8000-000000000001";
const resourceId = "a0000000-0000-4000-8000-000000000001";

const roles: readonly MembershipRole[] = [
  "patient",
  "clinician",
  "pharmacy",
  "operations",
  "support",
  "auditor",
  "admin",
  "release",
];
const resourceTypes: readonly AuthorisationResourceType[] = [
  "identity_contact",
  "consent",
  "intake",
  "clinical_decision",
  "prescription",
  "payment",
  "fulfilment",
  "support_case",
  "audit_evidence",
  "role_permission",
  "privileged_asset",
];

function principal(
  role: MembershipRole,
  options: Partial<HumanAuthorisationPrincipal> = {},
): HumanAuthorisationPrincipal {
  const privileged = role === "admin" || role === "release";
  const patient = role === "patient";
  return {
    kind: "human",
    subjectId,
    subjectStatus: "active",
    tenantId,
    tenantStatus: "active",
    role,
    membershipStatus: "active",
    membershipValidFrom: new Date("2029-12-01T00:00:00Z"),
    ...(patient ? {} : { membershipExpiresAt: new Date("2030-02-01T00:00:00Z") }),
    session: {
      id: "70000000-0000-4000-8000-000000000001",
      subjectId,
      providerSessionId: "71000000-0000-4000-8000-000000000001",
      sessionClass: patient ? "patient" : privileged ? "privileged" : "workforce",
      assurance: patient ? "aal1" : "aal2",
      status: "active",
      issuedAt: new Date("2030-01-01T00:00:00Z"),
      lastSeenAt: new Date("2030-01-01T00:55:00Z"),
      idleExpiresAt: new Date("2030-01-01T01:10:00Z"),
      absoluteExpiresAt: new Date("2030-01-01T04:00:00Z"),
    },
    ...options,
  };
}

function request(
  resourceType: AuthorisationResourceType,
  purpose: AuthorisationPurpose,
  action: AuthorisationRequest["action"] = "read",
  options: Partial<AuthorisationRequest["resource"]> = {},
): AuthorisationRequest {
  return {
    action,
    purpose,
    observedAt,
    resource: resolveServerAuthorisationResource({
      tenantId,
      type: resourceType,
      id: resourceId,
      ownerSubjectId: subjectId,
      workflowState: "active",
      restriction: "none",
      allowedPurposes: [purpose],
      ...options,
    }),
  };
}

function assignment(
  resourceType: AuthorisationResourceType,
  purpose: AuthorisationPurpose,
): AccessAssignment {
  return {
    id: "b0000000-0000-4000-8000-000000000001",
    tenantId,
    subjectId,
    resourceType,
    resourceId,
    purpose,
    status: "active",
    validFrom: new Date("2029-12-01T00:00:00Z"),
    expiresAt: new Date("2030-02-01T00:00:00Z"),
  };
}

describe("deny-default human authorisation policy", () => {
  it("defines an explicit cell for every approved role and resource", () => {
    expect(Object.keys(humanPolicyMatrix)).toEqual(roles);
    for (const role of roles) {
      expect(Object.keys(humanPolicyMatrix[role])).toEqual(resourceTypes);
    }
  });

  it.each([
    ["patient", "identity_contact", "read", "self_service", "own"],
    ["clinician", "clinical_decision", "approve", "care_delivery", "clinical"],
    ["pharmacy", "prescription", "transition", "dispensing", "dispensing"],
    ["operations", "fulfilment", "assign", "operations", "operations"],
    ["support", "support_case", "update", "support", "support"],
    ["auditor", "audit_evidence", "read", "privacy_review", "evidence"],
    ["admin", "role_permission", "administer", "security_administration", "configuration"],
    ["release", "privileged_asset", "transition", "release_management", "configuration"],
  ] as const)(
    "allows the approved %s %s boundary",
    (role, resourceType, action, purpose, projection) => {
      const relationships =
        role === "patient" ? [] : [assignment(resourceType, purpose as AuthorisationPurpose)];
      expect(
        evaluateHumanAuthorisation(
          principal(role),
          request(resourceType, purpose, action),
          relationships,
        ),
      ).toMatchObject({ allowed: true, reason: "ALLOWED", projection });
    },
  );

  it.each([
    [null, request("identity_contact", "self_service"), [], "NO_PRINCIPAL"],
    [
      principal("patient"),
      request("identity_contact", "self_service", "read", {
        tenantId: "10000000-0000-4000-8000-000000000002",
      }),
      [],
      "TENANT_MISMATCH",
    ],
    [
      principal("patient"),
      request("identity_contact", "self_service", "read", {
        ownerSubjectId: "20000000-0000-4000-8000-000000000002",
      }),
      [],
      "RELATIONSHIP_REQUIRED",
    ],
    [
      principal("patient"),
      request("clinical_decision", "self_service", "approve"),
      [],
      "ROLE_ACTION_DENIED",
    ],
    [
      principal("clinician"),
      request("clinical_decision", "support", "read"),
      [assignment("clinical_decision", "support")],
      "PURPOSE_DENIED",
    ],
    [
      principal("clinician"),
      request("clinical_decision", "care_delivery", "update", { workflowState: "closed" }),
      [assignment("clinical_decision", "care_delivery")],
      "WORKFLOW_STATE_DENIED",
    ],
    [
      principal("clinician", {
        session: { ...principal("clinician").session, sessionClass: "patient", assurance: "aal1" },
      }),
      request("clinical_decision", "care_delivery"),
      [assignment("clinical_decision", "care_delivery")],
      "ASSURANCE_INSUFFICIENT",
    ],
    [
      principal("operations"),
      request("fulfilment", "operations", "update"),
      [],
      "RELATIONSHIP_REQUIRED",
    ],
  ] as const)("denies negative access boundary %#", (actor, accessRequest, assignments, reason) => {
    expect(evaluateHumanAuthorisation(actor, accessRequest, assignments)).toMatchObject({
      allowed: false,
      reason,
    });
  });

  it.each([
    [principal("patient", { subjectStatus: "suspended" }), "SUBJECT_INACTIVE"],
    [principal("patient", { tenantStatus: "suspended" }), "TENANT_INACTIVE"],
    [principal("patient", { membershipStatus: "suspended" }), "MEMBERSHIP_INACTIVE"],
    [
      principal("patient", { membershipValidFrom: new Date("2030-01-02T00:00:00Z") }),
      "MEMBERSHIP_NOT_YET_ACTIVE",
    ],
    [
      principal("patient", { membershipExpiresAt: new Date("2030-01-01T01:00:00Z") }),
      "MEMBERSHIP_EXPIRED",
    ],
    [
      principal("patient", {
        session: { ...principal("patient").session, status: "revoked" },
      }),
      "SESSION_INACTIVE",
    ],
    [
      principal("patient", {
        session: {
          ...principal("patient").session,
          idleExpiresAt: new Date("2030-01-01T01:00:00Z"),
        },
      }),
      "SESSION_EXPIRED",
    ],
  ] as const)("denies inactive or expired context %#", (actor, reason) => {
    expect(
      evaluateHumanAuthorisation(actor, request("identity_contact", "self_service"), []),
    ).toMatchObject({ allowed: false, reason });
  });

  it("denies resource holds even when role, action and relationship otherwise allow access", () => {
    expect(
      evaluateHumanAuthorisation(
        principal("patient"),
        request("identity_contact", "self_service", "read", { restriction: "hold" }),
        [],
      ),
    ).toMatchObject({ allowed: false, reason: "RESOURCE_RESTRICTED" });
  });

  it("rejects a raw client-shaped resource that was not resolved by the server", () => {
    const unresolved = {
      ...request("identity_contact", "self_service"),
      resource: {
        tenantId,
        type: "identity_contact",
        id: resourceId,
        ownerSubjectId: subjectId,
        workflowState: "active",
        restriction: "none",
        allowedPurposes: ["self_service"],
      },
    } as unknown as AuthorisationRequest;

    expect(evaluateHumanAuthorisation(principal("patient"), unresolved, [])).toMatchObject({
      allowed: false,
      reason: "RESOURCE_UNRESOLVED",
    });
  });
});

describe("deny-default service authorisation policy", () => {
  function service(
    options: Partial<ServiceAuthorisationPrincipal> = {},
  ): ServiceAuthorisationPrincipal {
    return {
      kind: "service",
      id: "80000000-0000-4000-8000-000000000001",
      tenantId,
      environment: "local",
      purpose: "operations",
      status: "active",
      expiresAt: new Date("2030-02-01T00:00:00Z"),
      scopes: [
        {
          serviceIdentityId: "80000000-0000-4000-8000-000000000001",
          resource: "fulfilment",
          action: "update",
        },
      ],
      ...options,
    };
  }

  it("allows only the exact service environment, purpose, tenant and scope", () => {
    expect(
      evaluateServiceAuthorisation(
        service(),
        request("fulfilment", "operations", "update"),
        "local",
      ),
    ).toMatchObject({ allowed: true, reason: "ALLOWED" });
  });

  it.each([
    [service({ environment: "preview" }), "local", "SERVICE_ENVIRONMENT_MISMATCH"],
    [service({ purpose: "support" }), "local", "PURPOSE_DENIED"],
    [service({ status: "revoked" }), "local", "SERVICE_INACTIVE"],
    [service({ expiresAt: observedAt }), "local", "SERVICE_EXPIRED"],
    [service({ scopes: [] }), "local", "SERVICE_SCOPE_DENIED"],
    [service({ tenantId: "10000000-0000-4000-8000-000000000002" }), "local", "TENANT_MISMATCH"],
  ] as const)("denies invalid service boundary %#", (actor, environment, reason) => {
    expect(
      evaluateServiceAuthorisation(
        actor,
        request("fulfilment", "operations", "update"),
        environment,
      ),
    ).toMatchObject({ allowed: false, reason });
  });
});
