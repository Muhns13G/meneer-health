import type {
  AccessAssignment,
  AuthorisationResource,
  HumanAuthorisationPrincipal,
  ServiceAuthorisationPrincipal,
} from "@/domain/access/authorisation";
import type { MembershipRole, TenantId } from "@/domain/access/models";

export interface AuthorisationContextRepository {
  loadHumanPrincipal(
    providerSessionId: string,
    tenantId: TenantId,
    role: MembershipRole,
  ): Promise<HumanAuthorisationPrincipal | null>;
  listAssignments(
    subjectId: string,
    resource: AuthorisationResource,
  ): Promise<readonly AccessAssignment[]>;
  loadServicePrincipal(
    serviceIdentityId: string,
    credentialDigest: Uint8Array,
    observedAt: Date,
  ): Promise<ServiceAuthorisationPrincipal | null>;
}

export class AuthorisationContextUnavailableError extends Error {
  readonly code = "AUTHORISATION_CONTEXT_UNAVAILABLE";

  constructor() {
    super("Authorisation context is temporarily unavailable.");
    this.name = "AuthorisationContextUnavailableError";
  }
}
