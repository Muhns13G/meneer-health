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

  async findSubjectByVerifiedEmail(email: string): Promise<Subject | null> {
    const { data, error } = await this.client
      .from("subject_contacts")
      .select("subjects!inner(id, status)")
      .eq("provider", "supabase")
      .eq("kind", "email")
      .eq("normalized_value", email.trim().toLowerCase())
      .eq("status", "verified")
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

  async hasPilotAccountEvidence(tenantId: TenantId, subjectId: SubjectId): Promise<boolean> {
    const now = new Date().toISOString();
    const [profile, publications, lifecycle] = await Promise.all([
      this.client
        .from("client_profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("subject_id", subjectId)
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
      this.client
        .from("pilot_instrument_publications")
        .select("id, instrument_id")
        .in("instrument_id", ["pilot-account-terms", "pilot-privacy-notice"])
        .eq("locale", "en-ZA")
        .eq("status", "published")
        .lte("effective_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .returns<{ id: string; instrument_id: string }[]>(),
      this.client
        .from("pilot_account_lifecycle_events")
        .select("event_type")
        .eq("tenant_id", tenantId)
        .eq("subject_id", subjectId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .returns<{ event_type: string }[]>(),
    ]);
    ensureNoProviderError(profile.error);
    ensureNoProviderError(publications.error);
    ensureNoProviderError(lifecycle.error);
    const byInstrument = new Map(
      (publications.data ?? []).map((row) => [row.instrument_id, row.id]),
    );
    const termsId = byInstrument.get("pilot-account-terms");
    const privacyId = byInstrument.get("pilot-privacy-notice");
    if (
      !profile.data ||
      lifecycle.data?.[0]?.event_type !== "activated" ||
      !termsId ||
      !privacyId ||
      publications.data?.length !== 2
    )
      return false;
    const receipts = await this.client
      .from("pilot_instrument_receipts")
      .select("id, publication_id, instrument_id, action")
      .eq("tenant_id", tenantId)
      .eq("subject_id", subjectId)
      .in("publication_id", [termsId, privacyId])
      .returns<{ id: string; publication_id: string; instrument_id: string; action: string }[]>();
    ensureNoProviderError(receipts.error);
    const matched = (receipts.data ?? []).filter(
      (row) =>
        (row.publication_id === termsId &&
          row.instrument_id === "pilot-account-terms" &&
          row.action === "accepted") ||
        (row.publication_id === privacyId &&
          row.instrument_id === "pilot-privacy-notice" &&
          row.action === "acknowledged"),
    );
    if (
      !matched.some((row) => row.publication_id === termsId) ||
      !matched.some((row) => row.publication_id === privacyId)
    )
      return false;
    const events = await this.client
      .from("pilot_instrument_receipt_events")
      .select("receipt_id")
      .eq("tenant_id", tenantId)
      .eq("subject_id", subjectId)
      .in(
        "receipt_id",
        matched.map((row) => row.id),
      )
      .returns<{ receipt_id: string }[]>();
    ensureNoProviderError(events.error);
    const invalidated = new Set((events.data ?? []).map((row) => row.receipt_id));
    return [termsId, privacyId].every((publicationId) =>
      matched.some((row) => row.publication_id === publicationId && !invalidated.has(row.id)),
    );
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
