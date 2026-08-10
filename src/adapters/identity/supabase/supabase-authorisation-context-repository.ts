import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AuthorisationContextUnavailableError,
  type AuthorisationContextRepository,
} from "@/application/authorisation/authorisation-context-repository";
import type {
  AccessAssignment,
  AuthorisationResource,
  HumanAuthorisationPrincipal,
  ServiceAuthorisationPrincipal,
} from "@/domain/access/authorisation";
import type {
  AuthenticationAssurance,
  ServiceIdentityEnvironment,
  ServiceIdentityScope,
  SessionClass,
  SessionStatus,
} from "@/domain/access/identity";
import type {
  MembershipRole,
  MembershipStatus,
  SubjectStatus,
  TenantId,
  TenantStatus,
} from "@/domain/access/models";

type SessionRow = {
  id: string;
  subject_id: string;
  provider_session_id: string;
  session_class: SessionClass;
  assurance: AuthenticationAssurance;
  status: SessionStatus;
  issued_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  revoked_at: string | null;
};

type MembershipRow = {
  tenant_id: string;
  subject_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  valid_from: string;
  expires_at: string | null;
};

type AssignmentRow = {
  id: string;
  tenant_id: string;
  subject_id: string;
  resource_type: AccessAssignment["resourceType"];
  resource_id: string;
  purpose: AccessAssignment["purpose"];
  status: AccessAssignment["status"];
  valid_from: string;
  expires_at: string;
};

type ServiceIdentityRow = {
  id: string;
  tenant_id: string | null;
  environment: ServiceIdentityEnvironment;
  purpose: string;
  status: ServiceAuthorisationPrincipal["status"];
  expires_at: string;
};

type ServiceScopeRow = {
  service_identity_id: string;
  resource: string;
  action: ServiceIdentityScope["action"];
};

type ServiceCredentialRow = {
  id: string;
};

function byteaHex(value: Uint8Array): string {
  return `\\x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function ensureNoProviderError(error: unknown): void {
  if (error) throw new AuthorisationContextUnavailableError();
}

export class SupabaseAuthorisationContextRepository implements AuthorisationContextRepository {
  constructor(private readonly client: SupabaseClient) {}

  async loadHumanPrincipal(
    providerSessionId: string,
    tenantId: TenantId,
    role: MembershipRole,
  ): Promise<HumanAuthorisationPrincipal | null> {
    try {
      const sessionResult = await this.client
        .from("identity_sessions")
        .select(
          "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
        )
        .eq("provider_session_id", providerSessionId)
        .maybeSingle<SessionRow>();
      ensureNoProviderError(sessionResult.error);
      if (!sessionResult.data) return null;

      const [subjectResult, tenantResult, membershipResult] = await Promise.all([
        this.client
          .from("subjects")
          .select("status")
          .eq("id", sessionResult.data.subject_id)
          .maybeSingle<{ status: SubjectStatus }>(),
        this.client
          .from("tenants")
          .select("status")
          .eq("id", tenantId)
          .maybeSingle<{ status: TenantStatus }>(),
        this.client
          .from("tenant_memberships")
          .select("tenant_id, subject_id, role, status, valid_from, expires_at")
          .eq("tenant_id", tenantId)
          .eq("subject_id", sessionResult.data.subject_id)
          .eq("role", role)
          .maybeSingle<MembershipRow>(),
      ]);
      ensureNoProviderError(subjectResult.error);
      ensureNoProviderError(tenantResult.error);
      ensureNoProviderError(membershipResult.error);
      if (!subjectResult.data || !tenantResult.data || !membershipResult.data) return null;

      const session = sessionResult.data;
      const membership = membershipResult.data;
      return {
        kind: "human",
        subjectId: session.subject_id,
        subjectStatus: subjectResult.data.status,
        tenantId: membership.tenant_id,
        tenantStatus: tenantResult.data.status,
        role: membership.role,
        membershipStatus: membership.status,
        membershipValidFrom: new Date(membership.valid_from),
        ...(membership.expires_at ? { membershipExpiresAt: new Date(membership.expires_at) } : {}),
        session: {
          id: session.id,
          subjectId: session.subject_id,
          providerSessionId: session.provider_session_id,
          sessionClass: session.session_class,
          assurance: session.assurance,
          status: session.status,
          issuedAt: new Date(session.issued_at),
          lastSeenAt: new Date(session.last_seen_at),
          idleExpiresAt: new Date(session.idle_expires_at),
          absoluteExpiresAt: new Date(session.absolute_expires_at),
          ...(session.revoked_at ? { revokedAt: new Date(session.revoked_at) } : {}),
        },
      };
    } catch (error) {
      if (error instanceof AuthorisationContextUnavailableError) throw error;
      throw new AuthorisationContextUnavailableError();
    }
  }

  async listAssignments(
    subjectId: string,
    resource: AuthorisationResource,
  ): Promise<readonly AccessAssignment[]> {
    try {
      const { data, error } = await this.client
        .from("access_assignments")
        .select(
          "id, tenant_id, subject_id, resource_type, resource_id, purpose, status, valid_from, expires_at",
        )
        .eq("tenant_id", resource.tenantId)
        .eq("subject_id", subjectId)
        .eq("resource_type", resource.type)
        .eq("resource_id", resource.id)
        .returns<AssignmentRow[]>();
      ensureNoProviderError(error);

      return (data ?? []).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        subjectId: row.subject_id,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        purpose: row.purpose,
        status: row.status,
        validFrom: new Date(row.valid_from),
        expiresAt: new Date(row.expires_at),
      }));
    } catch (error) {
      if (error instanceof AuthorisationContextUnavailableError) throw error;
      throw new AuthorisationContextUnavailableError();
    }
  }

  async loadServicePrincipal(
    serviceIdentityId: string,
    credentialDigest: Uint8Array,
    observedAt: Date,
  ): Promise<ServiceAuthorisationPrincipal | null> {
    if (credentialDigest.byteLength !== 32) return null;

    try {
      const [identityResult, scopesResult, credentialResult] = await Promise.all([
        this.client
          .from("service_identities")
          .select("id, tenant_id, environment, purpose, status, expires_at")
          .eq("id", serviceIdentityId)
          .maybeSingle<ServiceIdentityRow>(),
        this.client
          .from("service_identity_scopes")
          .select("service_identity_id, resource, action")
          .eq("service_identity_id", serviceIdentityId)
          .returns<ServiceScopeRow[]>(),
        this.client
          .from("service_identity_credentials")
          .select("id")
          .eq("service_identity_id", serviceIdentityId)
          .eq("secret_digest", byteaHex(credentialDigest))
          .lte("valid_from", observedAt.toISOString())
          .gt("expires_at", observedAt.toISOString())
          .is("revoked_at", null)
          .maybeSingle<ServiceCredentialRow>(),
      ]);
      ensureNoProviderError(identityResult.error);
      ensureNoProviderError(scopesResult.error);
      ensureNoProviderError(credentialResult.error);
      if (!identityResult.data || !credentialResult.data) return null;

      const identity = identityResult.data;
      return {
        kind: "service",
        id: identity.id,
        environment: identity.environment,
        purpose: identity.purpose,
        status: identity.status,
        expiresAt: new Date(identity.expires_at),
        scopes: (scopesResult.data ?? []).map((scope) => ({
          serviceIdentityId: scope.service_identity_id,
          resource: scope.resource,
          action: scope.action,
        })),
        ...(identity.tenant_id ? { tenantId: identity.tenant_id } : {}),
      };
    } catch (error) {
      if (error instanceof AuthorisationContextUnavailableError) throw error;
      throw new AuthorisationContextUnavailableError();
    }
  }
}
