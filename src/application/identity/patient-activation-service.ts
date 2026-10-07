import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import {
  activationCommandSchema,
  type ActivationCommand,
  type ActivationView,
} from "@/domain/identity/pilot-activation";

export type ActivationProof = Readonly<{
  invitationId: string;
  tenantId: string;
  providerSubject: string;
  accessToken: string;
}>;
export type ActivationContext = Readonly<{
  invitationId: string;
  tenantId: string;
  providerSubject: string;
  providerSessionId: string;
}>;
export interface PatientActivationRepository {
  prepare(context: ActivationContext): Promise<ActivationView>;
  activate(context: ActivationContext, command: ActivationCommand): Promise<string>;
}

export class PatientActivationService {
  constructor(
    private readonly provider: Pick<ManagedIdentityProvider, "verifyAccessToken">,
    private readonly repository: PatientActivationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async prepare(proof: ActivationProof): Promise<ActivationView> {
    return this.repository.prepare(await this.context(proof));
  }

  async activate(proof: ActivationProof, input: unknown): Promise<void> {
    const parsed = activationCommandSchema.safeParse(input);
    if (!parsed.success) throw new IdentityRejectedError();
    const result = await this.repository.activate(await this.context(proof), parsed.data);
    if (!result) throw new IdentityRejectedError();
  }

  private async context(proof: ActivationProof): Promise<ActivationContext> {
    const identity = await this.provider.verifyAccessToken(proof.accessToken);
    if (
      identity.providerSubject !== proof.providerSubject ||
      identity.verifiedContact.kind !== "email" ||
      identity.expiresAt <= this.now()
    ) {
      throw new IdentityRejectedError();
    }
    return {
      invitationId: proof.invitationId,
      tenantId: proof.tenantId,
      providerSubject: identity.providerSubject,
      providerSessionId: identity.providerSessionId,
    };
  }
}
