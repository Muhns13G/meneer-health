import "@tanstack/react-start/server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  IdentityGovernanceRejectedError,
  IdentityGovernanceUnavailableError,
  type AddServiceIdentityCredential,
  type AddServiceIdentityScope,
  type CreatePatientInvitation,
  type CreateRecoveryCase,
  type CreateServiceIdentity,
  type IdentityGovernanceRepository,
} from "@/application/identity/identity-governance-repository";
import type {
  IdentityInvitation,
  IdentityRecoveryCase,
  ServiceIdentity,
  ServiceIdentityCredential,
  ServiceIdentityScope,
} from "@/domain/access/identity";
import type { SubjectId } from "@/domain/access/models";

type InvitationRow = {
  id: string;
  tenant_id: string;
  contact_digest: string;
  intended_role: "patient";
  provider_subject: string | null;
  status: IdentityInvitation["status"];
  expires_at: string;
  accepted_by_subject_id: string | null;
  accepted_at: string | null;
};

type RecoveryRow = {
  id: string;
  subject_id: string;
  recovery_class: IdentityRecoveryCase["recoveryClass"];
  status: IdentityRecoveryCase["status"];
  requested_at: string;
  expires_at: string;
  approved_by_subject_id: string | null;
  sessions_revoked_at: string | null;
};

type ServiceIdentityRow = {
  id: string;
  tenant_id: string | null;
  name: string;
  environment: ServiceIdentity["environment"];
  purpose: string;
  status: ServiceIdentity["status"];
  expires_at: string;
};

type ServiceScopeRow = {
  service_identity_id: string;
  resource: string;
  action: ServiceIdentityScope["action"];
};

type ServiceCredentialRow = {
  id: string;
  service_identity_id: string;
  valid_from: string;
  expires_at: string;
  revoked_at: string | null;
};

const invitationProjection =
  "id, tenant_id, contact_digest, intended_role, provider_subject, status, expires_at, accepted_by_subject_id, accepted_at";
const recoveryProjection =
  "id, subject_id, recovery_class, status, requested_at, expires_at, approved_by_subject_id, sessions_revoked_at";
const serviceIdentityProjection = "id, tenant_id, name, environment, purpose, status, expires_at";
const serviceCredentialProjection = "id, service_identity_id, valid_from, expires_at, revoked_at";

function mapInvitation(row: InvitationRow): IdentityInvitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    contactDigest: row.contact_digest,
    intendedRole: row.intended_role,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    ...(row.provider_subject ? { providerSubject: row.provider_subject } : {}),
    ...(row.accepted_by_subject_id ? { acceptedBySubjectId: row.accepted_by_subject_id } : {}),
    ...(row.accepted_at ? { acceptedAt: new Date(row.accepted_at) } : {}),
  };
}

function mapRecovery(row: RecoveryRow): IdentityRecoveryCase {
  return {
    id: row.id,
    subjectId: row.subject_id,
    recoveryClass: row.recovery_class,
    status: row.status,
    requestedAt: new Date(row.requested_at),
    expiresAt: new Date(row.expires_at),
    ...(row.approved_by_subject_id ? { approvedBySubjectId: row.approved_by_subject_id } : {}),
    ...(row.sessions_revoked_at ? { sessionsRevokedAt: new Date(row.sessions_revoked_at) } : {}),
  };
}

function mapServiceIdentity(row: ServiceIdentityRow): ServiceIdentity {
  return {
    id: row.id,
    name: row.name,
    environment: row.environment,
    purpose: row.purpose,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
  };
}

function mapServiceCredential(row: ServiceCredentialRow): ServiceIdentityCredential {
  return {
    id: row.id,
    serviceIdentityId: row.service_identity_id,
    validFrom: new Date(row.valid_from),
    expiresAt: new Date(row.expires_at),
    ...(row.revoked_at ? { revokedAt: new Date(row.revoked_at) } : {}),
  };
}

function requireRow<T>(row: T | null): T {
  if (!row) throw new IdentityGovernanceRejectedError();
  return row;
}

export class SupabaseIdentityGovernanceRepository implements IdentityGovernanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createPatientInvitation(input: CreatePatientInvitation): Promise<IdentityInvitation> {
    if (!/^[a-f0-9]{64}$/.test(input.contactDigest)) {
      throw new IdentityGovernanceRejectedError();
    }

    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_invitations")
        .insert({
          tenant_id: input.tenantId,
          contact_digest: input.contactDigest,
          intended_role: "patient",
          expires_at: input.expiresAt.toISOString(),
        })
        .select(invitationProjection)
        .single<InvitationRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapInvitation(requireRow(data));
    });
  }

  async bindInvitationProviderSubject(
    invitationId: string,
    providerSubject: string,
    observedAt: Date,
  ): Promise<IdentityInvitation> {
    if (!providerSubject.trim()) throw new IdentityGovernanceRejectedError();

    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_invitations")
        .update({ provider_subject: providerSubject })
        .eq("id", invitationId)
        .eq("status", "pending")
        .is("provider_subject", null)
        .gt("expires_at", observedAt.toISOString())
        .select(invitationProjection)
        .maybeSingle<InvitationRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapInvitation(requireRow(data));
    });
  }

  async acceptPatientInvitation(
    invitationId: string,
    subjectId: SubjectId,
    acceptedAt: Date,
  ): Promise<IdentityInvitation> {
    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_invitations")
        .update({
          status: "accepted",
          accepted_by_subject_id: subjectId,
          accepted_at: acceptedAt.toISOString(),
        })
        .eq("id", invitationId)
        .eq("status", "pending")
        .not("provider_subject", "is", null)
        .gt("expires_at", acceptedAt.toISOString())
        .select(invitationProjection)
        .maybeSingle<InvitationRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapInvitation(requireRow(data));
    });
  }

  async createRecoveryCase(input: CreateRecoveryCase): Promise<IdentityRecoveryCase> {
    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_recovery_cases")
        .insert({
          subject_id: input.subjectId,
          recovery_class: input.recoveryClass,
          requested_at: input.requestedAt.toISOString(),
          expires_at: input.expiresAt.toISOString(),
        })
        .select(recoveryProjection)
        .single<RecoveryRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapRecovery(requireRow(data));
    });
  }

  async approveWorkforceRecovery(
    recoveryCaseId: string,
    approverSubjectId: SubjectId,
    approvedAt: Date,
  ): Promise<IdentityRecoveryCase> {
    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_recovery_cases")
        .update({
          status: "approved",
          approved_by_subject_id: approverSubjectId,
          approved_at: approvedAt.toISOString(),
          updated_at: approvedAt.toISOString(),
        })
        .eq("id", recoveryCaseId)
        .eq("recovery_class", "workforce")
        .eq("status", "requested")
        .gt("expires_at", approvedAt.toISOString())
        .select(recoveryProjection)
        .maybeSingle<RecoveryRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapRecovery(requireRow(data));
    });
  }

  async completeRecovery(
    recoveryCaseId: string,
    sessionsRevokedAt: Date,
  ): Promise<IdentityRecoveryCase> {
    return this.execute(async () => {
      const { data, error } = await this.client
        .from("identity_recovery_cases")
        .update({
          status: "completed",
          sessions_revoked_at: sessionsRevokedAt.toISOString(),
          updated_at: sessionsRevokedAt.toISOString(),
        })
        .eq("id", recoveryCaseId)
        .in("status", ["requested", "approved"])
        .gt("expires_at", sessionsRevokedAt.toISOString())
        .select(recoveryProjection)
        .maybeSingle<RecoveryRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapRecovery(requireRow(data));
    });
  }

  async createServiceIdentity(input: CreateServiceIdentity): Promise<ServiceIdentity> {
    if (!input.name.trim() || !input.purpose.trim()) {
      throw new IdentityGovernanceRejectedError();
    }

    return this.execute(async () => {
      const { data, error } = await this.client
        .from("service_identities")
        .insert({
          tenant_id: input.tenantId ?? null,
          name: input.name,
          environment: input.environment,
          purpose: input.purpose,
          expires_at: input.expiresAt.toISOString(),
        })
        .select(serviceIdentityProjection)
        .single<ServiceIdentityRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapServiceIdentity(requireRow(data));
    });
  }

  async addServiceIdentityScope(input: AddServiceIdentityScope): Promise<ServiceIdentityScope> {
    if (!input.resource.trim()) throw new IdentityGovernanceRejectedError();

    return this.execute(async () => {
      const { data, error } = await this.client
        .from("service_identity_scopes")
        .insert({
          service_identity_id: input.serviceIdentityId,
          resource: input.resource,
          action: input.action,
        })
        .select("service_identity_id, resource, action")
        .single<ServiceScopeRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      const row = requireRow(data);
      return {
        serviceIdentityId: row.service_identity_id,
        resource: row.resource,
        action: row.action,
      };
    });
  }

  async addServiceIdentityCredential(
    input: AddServiceIdentityCredential,
  ): Promise<ServiceIdentityCredential> {
    if (input.secretDigest.byteLength !== 32 || input.validFrom >= input.expiresAt) {
      throw new IdentityGovernanceRejectedError();
    }

    return this.execute(async () => {
      const { data, error } = await this.client
        .from("service_identity_credentials")
        .insert({
          service_identity_id: input.serviceIdentityId,
          secret_digest: `\\x${Buffer.from(input.secretDigest).toString("hex")}`,
          valid_from: input.validFrom.toISOString(),
          expires_at: input.expiresAt.toISOString(),
        })
        .select(serviceCredentialProjection)
        .single<ServiceCredentialRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapServiceCredential(requireRow(data));
    });
  }

  async revokeServiceIdentityCredential(
    credentialId: string,
    revokedAt: Date,
  ): Promise<ServiceIdentityCredential> {
    return this.execute(async () => {
      const { data, error } = await this.client
        .from("service_identity_credentials")
        .update({ revoked_at: revokedAt.toISOString() })
        .eq("id", credentialId)
        .is("revoked_at", null)
        .select(serviceCredentialProjection)
        .maybeSingle<ServiceCredentialRow>();
      if (error) throw new IdentityGovernanceUnavailableError();
      return mapServiceCredential(requireRow(data));
    });
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof IdentityGovernanceRejectedError ||
        error instanceof IdentityGovernanceUnavailableError
      ) {
        throw error;
      }
      throw new IdentityGovernanceUnavailableError();
    }
  }
}

export type SupabaseIdentityGovernanceConfiguration = Readonly<{
  url: string;
  secretKey: string;
}>;

export function createSupabaseIdentityGovernanceRepository(
  configuration: SupabaseIdentityGovernanceConfiguration,
): IdentityGovernanceRepository {
  const client = createClient(configuration.url, configuration.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return new SupabaseIdentityGovernanceRepository(client);
}
