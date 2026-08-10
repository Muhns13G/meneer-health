import "@tanstack/react-start/server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  PersistenceUnavailableError,
  type AccessRepository,
} from "@/application/persistence/access-repository";
import type {
  MembershipRole,
  MembershipStatus,
  Subject,
  SubjectId,
  SubjectStatus,
  Tenant,
  TenantId,
  TenantMembership,
  TenantStatus,
} from "@/domain/access/models";

type TenantRow = {
  id: string;
  slug: string;
  display_name: string;
  status: TenantStatus;
};

type SubjectRow = {
  id: string;
  status: SubjectStatus;
};

type MembershipRow = {
  tenant_id: string;
  subject_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  valid_from: string;
  expires_at: string | null;
  approved_by_subject_id: string | null;
};

function ensureNoProviderError(error: unknown): void {
  if (error) {
    throw new PersistenceUnavailableError();
  }
}

export class SupabaseAccessRepository implements AccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findTenantById(tenantId: TenantId): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from("tenants")
      .select("id, slug, display_name, status")
      .eq("id", tenantId)
      .maybeSingle<TenantRow>();
    ensureNoProviderError(error);

    return data
      ? { id: data.id, slug: data.slug, displayName: data.display_name, status: data.status }
      : null;
  }

  async findSubjectById(subjectId: SubjectId): Promise<Subject | null> {
    const { data, error } = await this.client
      .from("subjects")
      .select("id, status")
      .eq("id", subjectId)
      .maybeSingle<SubjectRow>();
    ensureNoProviderError(error);

    return data ? { id: data.id, status: data.status } : null;
  }

  async findSubjectByExternalIdentity(
    provider: string,
    providerSubject: string,
  ): Promise<Subject | null> {
    const { data, error } = await this.client
      .from("external_identities")
      .select("subjects!inner(id, status)")
      .eq("provider", provider)
      .eq("provider_subject", providerSubject)
      .maybeSingle<{ subjects: SubjectRow }>();
    ensureNoProviderError(error);

    return data ? { id: data.subjects.id, status: data.subjects.status } : null;
  }

  async listMemberships(subjectId: SubjectId): Promise<readonly TenantMembership[]> {
    const { data, error } = await this.client
      .from("tenant_memberships")
      .select("tenant_id, subject_id, role, status, valid_from, expires_at, approved_by_subject_id")
      .eq("subject_id", subjectId)
      .returns<MembershipRow[]>();
    ensureNoProviderError(error);

    return (data ?? []).map((row) => ({
      tenantId: row.tenant_id,
      subjectId: row.subject_id,
      role: row.role,
      status: row.status,
      validFrom: new Date(row.valid_from),
      ...(row.expires_at ? { expiresAt: new Date(row.expires_at) } : {}),
      ...(row.approved_by_subject_id ? { approvedBySubjectId: row.approved_by_subject_id } : {}),
    }));
  }
}

export type SupabasePersistenceConfiguration = Readonly<{
  url: string;
  secretKey: string;
}>;

export function createSupabaseAccessRepository(
  configuration: SupabasePersistenceConfiguration,
): AccessRepository {
  const client = createClient(configuration.url, configuration.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return new SupabaseAccessRepository(client);
}
