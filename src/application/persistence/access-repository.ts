import type {
  Subject,
  SubjectId,
  Tenant,
  TenantId,
  TenantMembership,
} from "@/domain/access/models";

export interface AccessRepository {
  findTenantById(tenantId: TenantId): Promise<Tenant | null>;
  findSubjectById(subjectId: SubjectId): Promise<Subject | null>;
  findSubjectByExternalIdentity(provider: string, providerSubject: string): Promise<Subject | null>;
  listMemberships(subjectId: SubjectId): Promise<readonly TenantMembership[]>;
}

export class PersistenceUnavailableError extends Error {
  readonly code = "PERSISTENCE_UNAVAILABLE";

  constructor() {
    super("Persistence is temporarily unavailable.");
    this.name = "PersistenceUnavailableError";
  }
}
