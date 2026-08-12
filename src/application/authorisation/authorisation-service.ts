import type { MembershipRole } from "@/domain/access/models";
import type {
  AuthorisationDecision,
  AuthorisationRequest,
  ServiceAuthorisationPrincipal,
} from "@/domain/access/authorisation";
import type { AuthorisationContextRepository } from "./authorisation-context-repository";
import { evaluateHumanAuthorisation, evaluateServiceAuthorisation } from "./authorisation-policy";

export class AuthorisationService {
  constructor(private readonly repository: AuthorisationContextRepository) {}

  async authoriseHuman(
    providerSessionId: string,
    role: MembershipRole,
    request: AuthorisationRequest,
  ): Promise<AuthorisationDecision> {
    const principal = await this.repository.loadHumanPrincipal(
      providerSessionId,
      request.resource.tenantId,
      role,
    );
    const assignments = principal
      ? await this.repository.listAssignments(principal.subjectId, request.resource)
      : [];

    return evaluateHumanAuthorisation(principal, request, assignments);
  }

  async authoriseService(
    serviceIdentityId: string,
    credentialDigest: Uint8Array,
    environment: ServiceAuthorisationPrincipal["environment"],
    request: AuthorisationRequest,
  ): Promise<AuthorisationDecision> {
    const principal = await this.repository.loadServicePrincipal(
      serviceIdentityId,
      credentialDigest,
      request.observedAt,
    );
    return evaluateServiceAuthorisation(principal, request, environment);
  }
}
